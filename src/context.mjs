// Note: There's a bug with the Reflect receiver, somehow it thinks that context data has a setter and tries to put the receiver as its this.

export class SessionContext {
  /**
   *
   * @type {Object<string, * >}
   */
  #data = {};

  /**
   *
   * @param sessionData
   * @return {Object<string, *>}
   */
  constructor(sessionData) {
    this.#data = Object.assign(this.#data, sessionData);

    return new Proxy(this, {
      get: (target, prop) => Reflect.get(this.#data, prop),
      set: (target, prop, value) => Reflect.set(this.#data, prop, value)
    });
  }
}

/**
 * @type {Object<string, *>}
 */
export class StreamContext {
  /**
   * Processed Headers.
   * @note Declaration is only for documentation. The one in data is used instead.
   * @type {Object<string, *>}
   */
  processedHeaders;

  /**
   * The internal Session Context.
   * @type {SessionContext}
   */
  #sessionContext = null;

  /**
   * Context Data.
   * @type {Object<string, *>}
   */
  #data = {};

  /**
   * Done with stream processing.
   * @type {boolean}
   */
  #done = false;

  /**
   * Done with stream processing?
   * @return {boolean}
   */
  get done() {
    return this.#done;
  }

  /**
   * Can only be set to true. Never back to false.
   * @param {boolean} value
   */
  set done(value) {
    this.#done = this.#done || value; // can only be set to true
  }

  /**
   * @param {SessionContext | Object<string, *>} sessionContext
   * @param {Object<string, *>} data
   * @return {Object<string, *>}
   */
  constructor(sessionContext, data) {
    if (sessionContext instanceof SessionContext) {
      this.#sessionContext = sessionContext;
    } else {
      this.#sessionContext = new SessionContext(sessionContext);
    }

    this.#data = Object.assign(this.#data, data);
    delete this.#data.sessionData;
    this.#data.sessionData = this.#sessionContext;

    return new Proxy(this, {
      set: (target, prop, value) => {
        switch (prop) {
          case "sessionData":
            return Object.assign(this.#sessionContext, value);
          case "done":
            if (this.#done) return this.#done;
            else return this.#done = value;
        }

        return Reflect.set(this.#data, prop, value);
      },
      get: (target, prop) => {
        switch (prop) {
          case "sessionData":
            return this.#sessionContext;
          case "done":
            return this.#done;
        }

        return Reflect.get(this.#data, prop);
      }
    });
  }
}
