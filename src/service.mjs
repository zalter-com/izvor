import { constants as http2Constants } from "http2";
import {
	ErrorHandlerDescriptor,
	HandlerDescriptor,
	PostHandlerDescriptor,
	PreHandlerDescriptor
} from "./handler-descriptor.mjs";

const {
	HTTP2_HEADER_STATUS,
	HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2Constants;

// noinspection JSUnfilteredForInLoop

/**
 * @typedef {Object} ContextData
 * @property {Object<string, *>} sessionData
 * @property {Object<string, string>} [pathParams]
 * @property {Object<string, *>} [body]
 * @property {string} [rawBody]
 * @property {Object<string, string>} [searchParams]
 */

/**
 * @type Object<string, HandlerDescriptor | *>
 */
export default class Service {
	/**
	 * A map containing the handler descriptors for faster access.
	 * @type {Map<string, HandlerDescriptor>}
	 */
	#handlerDescriptors = new Map();

	/**
	 * The header this service is using to identify the handler to call.
	 * @type {string}
	 */
	#headerName = "";

	/**
	 *
	 * @type {RegExp}
	 */
	#headerRegExp;
	/**
	 * Is this instance initialised
	 * @type {boolean}
	 */
	#isInitialised = false;

	/**
	 * Are the preHandlers executed regardless of whether the service has a handler it can select ?
	 * @type {boolean}
	 */
	#alwaysExecPreHandlers = false;

	/**
	 * Ordered List of PreHandlerDescriptors.
	 * @type {PreHandlerDescriptor[]}
	 */
	#preHandlerDescriptors = [];

	/**
	 * Ordered List of PostHandlerDescriptors.
	 * @type {PostHandlerDescriptor[]}
	 */
	#postHandlerDescriptors = [];

	/**
	 * Error Handler Descriptor executed when an error is thrown.
	 * @type ErrorHandlerDescriptor
	 */
	#errorHandlerDescriptor;

	/**
	 *
	 * @param {string} headerName The header where you want the Stream Manager to look for its handler selection.
	 * @param {RegExp} [headerRegExp] RegExp with exactly one capturing group.
	 * @param {boolean} alwaysExecPreHandlers Whether or not to execute the preHandlers regardless of whether the service has a handler for the selected marker.
	 */
	constructor(headerName, headerRegExp = undefined, alwaysExecPreHandlers = false) {
		// reset all values (in case somebody thought they would do StreamManager.prototype.fn.call or something like it.
		if (!headerName) {
			throw new Error("A header must be set.");
		}

		if (headerRegExp && !headerRegExp instanceof RegExp) {
			throw new Error("HeaderRegExp must be a regular expression and have a capturing group if set.");
		}

		this.#alwaysExecPreHandlers = alwaysExecPreHandlers;
		this.#headerName = headerName;
		this.#headerRegExp = headerRegExp;
	}

	/**
	 * Sets the error Handler descriptor
	 * @param {ErrorHandlerDescriptor} errorHandlerDescriptor
	 */
	setErrorHandlerDescriptor(errorHandlerDescriptor) {
		if (!(errorHandlerDescriptor instanceof ErrorHandlerDescriptor)) {
			throw new Error("Error handlers can only be instances of ErrorHandlerDescriptor");
		}
		this.#errorHandlerDescriptor = errorHandlerDescriptor;
	}

	/**
	 * Adds a handler descriptor.
	 * @param {string} marker
	 //Not sure... probably? * @param {HandlerDescriptor | PreHandlerDescriptor | PostHandlerDescriptor} handlerDescriptor
	 * @param {HandlerDescriptor} handlerDescriptor
	 */
	setHandlerDescriptor(marker, handlerDescriptor) {
		if (typeof marker !== "string") {
			throw new Error("Markers values MUST be strings");
		}

		if (
			!(handlerDescriptor instanceof HandlerDescriptor)
		) {
			throw new Error("Accepts only handler descriptors.");
		}

		if (!marker) {
			this.#handlerDescriptors.set("", handlerDescriptor);
			return;
		}

		this.#handlerDescriptors.set(marker, handlerDescriptor);
	}

	/**
	 * Adds another PreHandler.
	 * @param {PreHandlerDescriptor} handlerDescriptors
	 */
	addPreHandlerDescriptors(...handlerDescriptors) {
		if (handlerDescriptors.some((handlerDescriptor) => !(handlerDescriptor instanceof PreHandlerDescriptor))) {
			throw new Error("Parameter 'handlerDescriptor' must be an instance of PostHandlerDescriptor.");
		}

		this.#preHandlerDescriptors.push(...handlerDescriptors);
	}

	/**
	 * Adds another postHandler.
	 * @param {PostHandlerDescriptor} handlerDescriptors
	 */
	addPostHandlerDescriptors(...handlerDescriptors) {
		if (handlerDescriptors.some((handlerDescriptor) => !(handlerDescriptor instanceof PostHandlerDescriptor))) {
			throw new Error("Parameter 'handlerDescriptor' must be an instance of PostHandlerDescriptor.");
		}

		this.#postHandlerDescriptors.push(...handlerDescriptors);
	}

	/**
	 *
	 * @param {ServerHttp2Stream} stream
	 * @param {Object<string, *>} headers
	 * @return {HandlerDescriptor}
	 */
	#getSelectedDescriptor(stream, headers) {
		if (this.#headerRegExp) {
			const matchResult = headers[this.#headerName].match(this.#headerRegExp);

			if (!matchResult) {
				stream.respond({
					[HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR
				}, { endStream: true });
				console.error(`The stream header ${this.#headerName} had a value of ${headers[this.#headerName]} which did not match ${this.#headerRegExp}`);
				return null;
			}

			const matchedDescriptor = this.#handlerDescriptors.get(matchResult[1]);

			if (matchedDescriptor) {
				headers[this.#headerName] = headers[this.#headerName].replace(this.#headerRegExp, "");
			}

			return matchedDescriptor;
		}

		return this.#handlerDescriptors.get(headers[this.#headerName]);
	}

	/**
	 *
	 * @param {ServerHttp2Stream} stream
	 * @param {IncomingHttpHeaders} headers
	 * @param {number} flags
	 * @param {StreamContext} context
	 */
	async handle(stream, headers, flags, context) {
		const selectedDescriptor = this.#getSelectedDescriptor(stream, context.processedHeaders);
		try {
			if (selectedDescriptor || this.#alwaysExecPreHandlers) {
				// I think pre handlers should be executed only if there's a handler found. otherwise execute only the post handlers?
				for (const handlerDescriptor of this.#preHandlerDescriptors) {
					await handlerDescriptor.handle(stream, headers, flags, context);
				}

				if (selectedDescriptor) {
					await selectedDescriptor.handle(stream, headers, flags, context);
				}
			}

			for (const handlerDescriptor of this.#postHandlerDescriptors) {
				await handlerDescriptor.handle(stream, headers, flags, context);
			}
		} catch (err) {
			if (!this.#errorHandlerDescriptor) {
				throw err;
			}
			await this.#errorHandlerDescriptor.handle(stream, headers, flags, context, err); // won't catch since if an error goes here...
		}
	}
}
