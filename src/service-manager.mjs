import { constants as http2Constants } from "http2";
import { SessionContext, StreamContext } from "./context.mjs";
import Service from "./service.mjs";

const {
	HTTP2_HEADER_PATH,
	HTTP2_HEADER_METHOD,
	HTTP2_HEADER_STATUS,
	HTTP_STATUS_OK,
	HTTP_STATUS_INTERNAL_SERVER_ERROR,
	HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN
} = http2Constants;

/**
 * @typedef {Object} CORSHeaders
 * @property {string} ['Access-Control-Allow-Origin'=*]
 * @property {string} ['Access-Control-Allow-Credentials'=true]
 * @property {string} ['Access-Control-Allow-Headers'=*]
 * @property {string} ['Access-Control-Allow-Methods'=*]
 */

export default class ServiceManager {
	/**
	 * Constructs a ServiceManager setting its header lookup and the regex for the item selection.
	 * If the regexp is missing it'll use the header in its entirety. (way faster)
	 * @note if  you want to use it with the ":path" header, you can use the static ready made regexp (StreamManager.FIRST_PATH_ELEMENT)
	 * @param {string | null} headerName The header where you want the Stream Manager to look for its stream processor selection.
	 * @param {RegExp} [headerRegExp] RegExp with exactly one capturing group.
	 */
	constructor(
		headerName = null,
		headerRegExp = undefined
	) {
		// reset all values (in case somebody thought they would do StreamManager.prototype.fn.call or something like it.
		if (!headerName) {
			throw new Error("A header must be set.");
		}

		if (headerRegExp && !headerRegExp instanceof RegExp) {
			throw new Error("HeaderRegExp must be a regular expression and have a capturing group if set.");
		}

		this.#headerName = headerName;
		this.#headerRegExp = headerRegExp;
	}

	/**
	 * Stream Processors Container (StreamManagers and StreamHandlers)
	 * @type {Map<string, ServiceManager | Service>}
	 */
	#streamProcessors = new Map();
	/**
	 * The name of the header this StreamManager looks for to do its stream processor selection.
	 * @type {string | null}
	 */
	#headerName = null;
	#headerRegExp;

	/**
	 * This enables ALTSVC on the outside port as well as adding CORS headers and responding to OPTIONS requests.
	 * Note that one no longer can process requests on the header ":method" with the value "OPTIONS" once this is enabled.
	 * @param {string} altSvcHeaderValue
	 * @param {boolean | CorsHeaders} enableCors
	 */
	enableAltSvc(altSvcHeaderValue, enableCors = true) {
		this.altSvc = altSvcHeaderValue;
		this.enableCors = enableCors;
	}

	/**
	 *
	 * @param {string} marker
	 * @param {ServiceManager | Service} streamProcessor
	 */
	#setServiceProcessor(marker = "", streamProcessor) {
		if (typeof marker !== "string") {
			throw new Error("Markers values MUST be strings");
		}

		if (!streamProcessor instanceof ServiceManager || !streamProcessor instanceof Service) {
			throw new Error("Only StreamManagers or StreamHandlers accepted.");
		}

		this.#streamProcessors.set(marker, streamProcessor);
	}

	/**
	 * Sets the service that should be invoked when the marker is matched.
	 * @param {string} marker
	 * @param {Service} service
	 */
	setService(marker, service) {
		this.#setServiceProcessor(marker, service);
	}

	/**
	 * Sets the ServiceManager that should be invoked when the marker is matched. This is used for chaining.
	 * @param {string} marker
	 * @param {string} serviceManager
	 */
	setSubManager(marker, serviceManager) {
		this.#setServiceProcessor(marker, serviceManager);
	}

	/**
	 *
	 * @param {ServerHttp2Stream} stream
	 * @param {Object<string, *>} headers
	 * @return {ServiceManager|Service|null}
	 */
	#getSelectedProcessor(stream, headers) {
		if (this.#headerRegExp) {
			const matchResult = headers[this.#headerName].match(this.#headerRegExp);

			if (!matchResult) {
				// no headerMatch. Should probably result in a 500.
				stream.respond({
					[HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR
				}, { endStream: true });
				console.error(`The stream header ${this.#headerName} had a value of ${headers[this.#headerName]} which did not match ${this.#headerRegExp}`);
				return null;
			}

			const streamProcessor = this.#streamProcessors.get(matchResult[1]);

			if (!streamProcessor) {
				return this.#streamProcessors.get("");
			}

			headers[this.#headerName] = headers[this.#headerName].replace(this.#headerRegExp, "");
			return streamProcessor;
		}

		const streamProcessor = this.#streamProcessors.get(headers[this.#headerName]);
		if (!streamProcessor) {
			return this.#streamProcessors.get("");
		}
		return streamProcessor;
	}

	/**
	 * Handles the CORS for HTTP/2 should it have been enabled.
	 * @param {ServerHttp2Stream} stream
	 * @param {IncomingHttpHeaders} headers
	 */
	handleCORS(stream, headers) {
		if (this.altSvc)
			stream.session.altsvc(this.altSvc, stream.id);

		// All subsequent respond calls will add these headers.
		const additionalHeaders = {
			[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: "*",
		};
		if (this.enableCors) {
			if (typeof this.enableCors === "object") {
				Object.assign(additionalHeaders, {
					[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: `${this.enableCors[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]}`,
					"Access-Control-Allow-Credentials": `${this.enableCors["Access-Control-Allow-Credentials"] || false}`,
					"Access-Control-Allow-Headers": `${this.enableCors["Access-Control-Allow-Headers"] || "*"}`,
					"Access-Control-Allow-Methods": `${this.enableCors["Access-Control-Allow-Methods"] || "*"}`
				});
			}
			const oldRespondFunction = stream.respond;
			stream.respond = (respondHeaders, respondOptions) => {
				oldRespondFunction.call(stream, Object.assign({}, respondHeaders, additionalHeaders), respondOptions);
			};

			if (headers[HTTP2_HEADER_METHOD] === "OPTIONS") {
				stream.respond({
					[HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
					"access-control-allow-methods": "*",
					"access-control-allow-headers": "*"
				}, { endStream: true });
			}
		}
	}

	/**
	 *
	 * @param {ServerHttp2Stream} stream
	 * @param {IncomingHttpHeaders} headers
	 * @param {number} flags
	 * @param {SessionContext | StreamContext} context
	 * @return {Promise<*>}
	 */
	async handle(stream, headers, flags, context) {
		if (this.altSvc) {
			this.handleCORS(stream, headers);

			if (stream.headersSent) {
				return;
			}
		}

		let passedContext = context;

		if (context instanceof SessionContext) {
			passedContext = new StreamContext(context, {
				processedHeaders: Object.assign({}, headers)
			});
		}

		const virtualURL = new URL(`${headers[HTTP2_HEADER_PATH]}`, "https://localhost");
		context.searchParams = Array.from(virtualURL.searchParams.keys())
			.reduce((acc, item) => (acc[item] = virtualURL.searchParams.get(item), acc), {});

		let selectedProcessor = this.#getSelectedProcessor(stream, passedContext.processedHeaders);

		if (selectedProcessor && !stream.headersSent) {
			await selectedProcessor.handle(stream, headers, flags, passedContext);
			return;
		}

		console.warn("No stream processor could be selected.", headers);
	};
}
