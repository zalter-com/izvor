/**
 * @typedef {Object} DescriptorObject
 * @property {PreHandlerDescriptor[]} [preHandlers]
 * @property {PostHandlerDescriptor[]} [postHandlers]
 * @property {HandlerFunction} [handlerFunction]
 * @property {ErrorHandlerDescriptor} [errorHandlerDescriptor]
 */

/**
 * @callback HandlerFunction
 * @param {ServerHttp2Stream} stream
 * @param {IncomingHttpHeaders} [headers]
 * @param {number} [flags]
 * @param {StreamContext} [context]
 * @param {...*} [additionalParams]
 * @return {* | Promise<*>}
 */

class BasicHandlerDescriptor {
	/**
	 * The actual handler function.
	 * @type HandlerFunction
	 */
	#handler = (stream, headers, flags, context, p) => {};

	constructor(descriptorObject) {
		if (descriptorObject.handlerFunction && typeof descriptorObject.handlerFunction !== "function") {
			throw new Error("The handler must be a function.");
		}

		this.#handler = descriptorObject.handlerFunction || this.#handler;
	}

	/**
	 * Sets the handler function.
	 * @param {HandlerFunction} handlerFunction
	 */
	setHandlerFunction(handlerFunction) {
		if (typeof handlerFunction !== "function") {
			throw new Error("The handler must be a function.");
		}

		this.#handler = handlerFunction;
	}

	/**
	 * Handles the stream using the provided handler.
	 * @param {ServerHttp2Stream} stream
	 * @param {IncomingHttpHeaders} headers
	 * @param {number} flags
	 * @param {StreamContext} context
	 * @param {...*} [additionalParams]
	 * @return Promise<void>
	 */
	handle(stream, headers, flags, context, ...additionalParams) {
		return this.#handler(stream, headers, flags, context, ...additionalParams);
	}
}

export class HandlerDescriptor extends BasicHandlerDescriptor {
	/**
	 *
	 * @param {DescriptorObject} descriptorObject
	 */
	constructor(descriptorObject) {
		super(descriptorObject);

		if (descriptorObject.preHandlers && (typeof descriptorObject.preHandlers !== "object"
			|| !Array.isArray(descriptorObject.preHandlers)
			|| descriptorObject.preHandlers.some(handler => !(handler instanceof PreHandlerDescriptor))
		)) {
			throw new Error("ALL PreHandlers must be PreHandlerDescriptors");
		}

		if (descriptorObject.postHandlers && (typeof descriptorObject.postHandlers !== "object"
			|| !Array.isArray(descriptorObject.postHandlers)
			|| descriptorObject.postHandlers.some(handler => !(handler instanceof PostHandlerDescriptor))
		)) {
			throw new Error("ALL PostHandlers must be PostHandlerDescriptors");
		}

		this.#preHandlerDescriptors = this.#preHandlerDescriptors.concat(descriptorObject.preHandlers || []);
		this.#postHandlerDescriptors = this.#postHandlerDescriptors.concat(descriptorObject.postHandlers || []);
	}

	/**
	 * Ordered array of PreHandlerDescriptors which are executed prior to the actual handler.
	 * @type {PreHandlerDescriptor[]}
	 */
	#preHandlerDescriptors = [];
	/**
	 * Ordered array of PostHandlerDescriptor which are executed after the actual handler.
	 * _Usually_ the stream is closed by the time the stream has reached this.
	 * @type {PostHandlerDescriptor[]}
	 */
	#postHandlerDescriptors = [];
	/**
	 * Error Handler Descriptor executed when an error is thrown.
	 * @type ErrorHandlerDescriptor
	 */
	#errorHandlerDescriptor;

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
	 * Adds another PreHandler.
	 * @param {PreHandlerDescriptor} handlerDescriptors
	 */
	addPreHandlerDescriptors(...handlerDescriptors) {
		if (
			handlerDescriptors.some(
				(handlerDescriptor) => !(handlerDescriptor instanceof PreHandlerDescriptor)
			)
		) {
			throw new Error("Parameter 'handlerDescriptor' must be an instance of PreHandlerDescriptor.");
		}

		this.#preHandlerDescriptors.push(...handlerDescriptors);
	}

	/**
	 * Adds another postHandler.
	 * @param {PostHandlerDescriptor} handlerDescriptors
	 */
	addPostHandlerDescriptors(...handlerDescriptors) {
		if (
			handlerDescriptors.some(
				(handlerDescriptor) => !(handlerDescriptor instanceof PostHandlerDescriptor)
			)
		) {
			throw new Error("Parameter 'handlerDescriptor' must be an instance of PostHandlerDescriptor.");
		}
		this.#postHandlerDescriptors.push(...handlerDescriptors);
	}


	// noinspection JSCheckFunctionSignatures
	/**
	 * Handle an incoming stream
	 * @param {ServerHttp2Stream} stream
	 * @param {IncomingHttpHeaders} headers
	 * @param {number} flags
	 * @param {StreamContext} context
	 * @return {Promise<void>}
	 */
	async handle(stream, headers, flags, context) {
		try {
			for (const handlerDescriptor of this.#preHandlerDescriptors) {
				if (!context.done) {
					await handlerDescriptor.handle(stream, headers, flags, context);
				}
			}

			await super.handle(stream, headers, flags, context);

			for (const handlerDescriptor of this.#postHandlerDescriptors) {
				await handlerDescriptor.handle(stream, headers, flags, context);
			}
		} catch (error) {
			if (!this.#errorHandlerDescriptor) {
				throw error;
			}
			await this.#errorHandlerDescriptor.handle(stream, headers, flags, context, error);
		}
	}
}

export class PreHandlerDescriptor extends BasicHandlerDescriptor {}

export class PostHandlerDescriptor extends BasicHandlerDescriptor {}

export class ErrorHandlerDescriptor extends BasicHandlerDescriptor {
	handle(stream, headers, flags, context, error) {
		return super.handle(stream, headers, flags, context, error);
	}
}
