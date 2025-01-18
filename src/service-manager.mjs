import { constants as http2Constants } from "http2";
import { SessionContext, StreamContext } from "./context.mjs";
import Service from "./service.mjs";

const {
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_OK,
  HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS
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
   * The name of the header this StreamManager looks for to do its stream processor selection.
   * @type {string | null}
   */
  #serviceSelector;

  /**
   * Regular expression for selector matching
   * @type {RegExp}
   */
  #serviceMatcher;

  /**
   * Stream Processors Container (ServiceManagers and Service)
   * @type {Map<string, ServiceManager | Service>}
   */
  #streamProcessors = new Map();

  /**
   * @type {string | null}
   */
  #altSvc = null;

  /**
   * @type {boolean | CORSHeaders}
   */
  #enableCORS = false;

  /**
   * Constructs a ServiceManager setting its header lookup and the regex for the item selection.
   * If the regexp is missing it'll use the header in its entirety. (way faster)
   * @param {string | null} serviceSelector The header where you want the Stream Manager to look for its stream processor selection.
   * @param {RegExp} [serviceMatcher] RegExp with exactly one capturing group.
   */
  constructor(serviceSelector = null, serviceMatcher) {
    if (!serviceSelector) {
      throw new Error("Service selector must be set.");
    }

    if (serviceMatcher && !serviceMatcher instanceof RegExp) {
      throw new Error("Service matcher must be a regular expression and have a capturing group if set.");
    }

    this.#serviceSelector = serviceSelector;
    this.#serviceMatcher = serviceMatcher;
  }

  /**
   * This enables Alt-Svc on the outside port
   * @param {string} value
   */
  set altSvc(value) {
    this.#altSvc = value;
  }

  /**
   * @note No longer can process requests on the header ":method" with the value "OPTIONS" once this is enabled.
   * @param {boolean | CORSHeaders} value
   */
  set enableCORS(value) {
    this.#enableCORS = value;
  }

  /**
   *
   * @param {string} marker
   * @param {ServiceManager | Service} streamProcessor
   */
  #setServiceProcessor(marker = "", streamProcessor) {
    if (typeof marker !== "string") {
      throw new Error("Markers values MUST be strings.");
    }

    if (!streamProcessor instanceof ServiceManager || !streamProcessor instanceof Service) {
      throw new Error("Only StreamManager or Service instances accepted.");
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
   * @param {ServiceManager} serviceManager
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
    if (this.#serviceMatcher) {
      const matchResult = headers[this.#serviceSelector].match(this.#serviceMatcher);

      if (!matchResult) {
        stream.respond(
          { [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR },
          { endStream: true }
        );
        console.error(`The service selector "${this.#serviceSelector}" had a value of "${headers[this.#serviceSelector]}" which did not match "${this.#serviceMatcher}"`);
        return null;
      }

      const streamProcessor = this.#streamProcessors.get(matchResult[1]);

      if (!streamProcessor) {
        return this.#streamProcessors.get("");
      }

      headers[this.#serviceSelector] = headers[this.#serviceSelector].replace(this.#serviceMatcher, "");
      return streamProcessor;
    }

    const streamProcessor = this.#streamProcessors.get(headers[this.#serviceSelector]);

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
    // All subsequent respond calls will add these headers.
    const additionalHeaders = {
      [HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: "*"
    };

    if (typeof this.#enableCORS === "object") {
      Object.assign(additionalHeaders, {
        [HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]: `${this.#enableCORS[HTTP2_HEADER_ACCESS_CONTROL_ALLOW_ORIGIN]}`,
        "Access-Control-Allow-Credentials": `${this.#enableCORS["Access-Control-Allow-Credentials"] || false}`,
        "Access-Control-Allow-Headers": `${this.#enableCORS["Access-Control-Allow-Headers"] || "*"}`,
        "Access-Control-Allow-Methods": `${this.#enableCORS["Access-Control-Allow-Methods"] || "*"}`
      });
    }

    const oldRespondFunction = stream.respond;
    stream.respond = (respondHeaders, respondOptions) => {
      oldRespondFunction.call(stream, Object.assign({}, respondHeaders, additionalHeaders), respondOptions);
    };

    if (headers[HTTP2_HEADER_METHOD] === "OPTIONS") {
      stream.respond(
        {
          [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
          "access-control-allow-methods": "*",
          "access-control-allow-headers": "*"
        },
        { endStream: true }
      );
    }
  }

  /**
   * @param {ServerHttp2Stream} stream
   * @param {IncomingHttpHeaders} headers
   * @param {number} flags
   * @param {SessionContext | StreamContext} context
   * @return {Promise<*>}
   */
  async handle(stream, headers, flags, context) {
    if (this.#altSvc) {
      stream.session.altsvc(this.#altSvc, stream.id);
    }

    if (this.#enableCORS) {
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

    const selectedProcessor = this.#getSelectedProcessor(stream, passedContext.processedHeaders);

    if (selectedProcessor && !stream.headersSent) {
      await selectedProcessor.handle(stream, headers, flags, passedContext);
      return;
    }

    console.warn("No stream processor could be selected.", headers);
  };
}
