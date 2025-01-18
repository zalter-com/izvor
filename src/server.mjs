import http2, { constants as http2Constants } from "http2";
import EventEmitter from "events";
import { SessionContext } from "./context.mjs";
import ServiceManager from "./service-manager.mjs";

const {
  HTTP2_HEADER_STATUS,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = http2Constants;

/**
 * @typedef {Object} Server~ServerOptions~SSLOptions
 * @property {string | Buffer} key The SSL Key as a string (not a path)
 * @property {string | Buffer} cert The full chain certificate. Some issuers give it in two files. These need to be concatenated as cert + chain.
 * @property {string | Buffer} [passPhrase] The passphrase used
 */

/**
 * @typedef {Object} Server~ServerOptions
 * @property {Server~ServerOptions~SSLOptions} ssl
 */

export default class Server extends EventEmitter {
  /**
   * @type {Http2SecureServer}
   */
  #http2SecureServer = null;

  /**
   * The main stream Manager
   * @type {ServiceManager}
   */
  #serviceManager = null;

  /**
   *
   * @type {Set<ServerHttp2Session>}
   */
  #sessions = new Set();

  /**
   * @emits ["close", "connect", "error", "session", "listen"]
   * @param {Server~ServerOptions} options
   */
  constructor(options) {
    super();

    if (
      !(
        (typeof options?.ssl?.key === "string" && typeof options?.ssl?.cert === "string") ||
        (options?.ssl?.key instanceof Buffer && options?.ssl?.cert instanceof Buffer)
      )
    ) {
      throw new Error("SSL key and certificate must be provided.");
    }

    this.#http2SecureServer = http2.createSecureServer({
      key: options.ssl.key,
      cert: options.ssl.cert
    });

    // Add pass-through events.
    this.#http2SecureServer.on("close", () => this.emit("close"));
    this.#http2SecureServer.on("error", (err) => this.emit("error", err));
  }

  /**
   * Sets the service manager.
   * @param serviceManager
   */
  set serviceManager(serviceManager) {
    if (!serviceManager instanceof ServiceManager) {
      throw new Error("An instance of ServiceManager is expected");
    }

    this.#serviceManager = serviceManager;
  }

  /**
   * The service manager as it was set with the setter.
   * @returns {ServiceManager}
   */
  get serviceManager() {
    return this.#serviceManager;
  }

  /**
   * Starts listening on the port and host provided.
   * @param {number} port
   * @param {string} host
   */
  listen(port = 3000, host = "localhost") {
    this.#http2SecureServer.on("session", (session) => {
      const sessionContext = new SessionContext();

      this.emit("session", session, sessionContext);

      this.#serviceManager && session.on("stream", (stream, headers, flags) => {
        this.#serviceManager.handle(stream, headers, flags, sessionContext)
          .catch((error) => {
            console.error(error);

            if (!stream.headersSent) {
              stream.respond(
                { [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR },
                { endStream: true }
              );
            }

            if (!stream.writableEnded) {
              // we can't send trailers here with the 500 status because browsers still respect some http1.1 standards
              stream.end();
            }
          });
      });
      session.on("close", () => {
        this.emit("session_close", session, sessionContext);
      });
    });

    this.#http2SecureServer.listen(port, host, () => {
      this.emit("listen");
    });
  }

  stop() {
    this.#http2SecureServer.close();
  }
}
