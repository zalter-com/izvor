export class SessionContext {
  /**
   *
   * @type {Object<string, * >}
   */
  #sessionData = {};

	/**
	 *
	 * @param sessionData
	 * @return {Object<string, *>}
	 */
	constructor(sessionData) {
		this.#sessionData = Object.assign(this.#sessionData, sessionData);

		return new Proxy(this, {
			get: (target, prop, receiver) => Reflect.get(this.#sessionData, prop, receiver),
			set: (target, prop, value, receiver) => Reflect.set(this.#sessionData, prop, value, receiver)
		});
	}
}

/**
 * @type {Object<string, *>}
 */
export class StreamContext {
	/**
	 * Processed Headers.
	 * @note Declaration is only for documentation. The one in contextData is used instead.
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
	#contextData = {};

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
	 * @param sessionContext
	 * @param contextData
	 * @return {Object<string, *>}
	 */
	constructor(sessionContext, contextData) {
		if (sessionContext instanceof SessionContext) {
			this.#sessionContext = sessionContext;
		} else {
			this.#sessionContext = new SessionContext(sessionContext);
		}

		this.#contextData = Object.assign(this.#contextData, contextData);
		delete this.#contextData.sessionData;
		this.#contextData.sessionData = this.#sessionContext;

		return new Proxy(this, {
			set: (target, prop, value, receiver) => {
				switch (prop) {
					case "sessionData":
						return Object.assign(this.#sessionContext, value);
					case "done":
						if (this.#done) return this.#done;
						else return this.#done = value;
				}

				return Reflect.set(this.#contextData, prop, value, receiver);
			},
			get: (target, prop, receiver) => {
				switch (prop) {
					case "sessionData":
						return this.#sessionContext;
					case "done":
						return this.#done;
				}

				return Reflect.get(this.#contextData, prop, receiver);
			}
		});
	}
}
