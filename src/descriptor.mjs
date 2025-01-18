/**
 * @callback Handler
 * @param {ServerHttp2Stream} stream
 * @param {IncomingHttpHeaders} [headers]
 * @param {number} [flags]
 * @param {StreamContext} [context]
 * @param {...*} [additionalParams]
 */

/**
 * @typedef {Object} DescriptorObject
 * @property {PreDescriptor[]} [preDescriptors]
 * @property {PostDescriptor[]} [postDescriptors]
 * @property {Handler} [handler]
 * @property {ErrorDescriptor} [errorDescriptor]
 */

class BasicDescriptor {
  /**
   * The actual handler function.
   * @type Handler
   */
  #handler = (stream, headers, flags, context, p) => {};

  /**
   * @param {DescriptorObject} descriptorObject
   */
  constructor(descriptorObject) {
    if (descriptorObject.handler && typeof descriptorObject.handler !== "function") {
      throw new Error("The handler must be a function.");
    }

    this.#handler = descriptorObject.handler || this.#handler;
  }

  /**
   * Sets the handler function.
   * @param {Handler} handler
   */
  setHandler(handler) {
    if (typeof handler !== "function") {
      throw new Error("The handler must be a function.");
    }

    this.#handler = handler;
  }

  /**
   * Handles the stream using the provided handler.
   * @param {ServerHttp2Stream} stream
   * @param {IncomingHttpHeaders} headers
   * @param {number} flags
   * @param {StreamContext} context
   * @param {...*} [additionalParams]
   */
  handle(stream, headers, flags, context, ...additionalParams) {
    return this.#handler(stream, headers, flags, context, ...additionalParams);
  }
}

export class Descriptor extends BasicDescriptor {
  /**
   * Ordered array of preDescriptors which are executed prior to the actual descriptor.
   * @type {PreDescriptor[]}
   */
  #preDescriptors = [];

  /**
   * Ordered array of PostDescriptor which are executed after the actual descriptor.
   * _Usually_ the stream is closed by the time the stream has reached this.
   * @type {PostDescriptor[]}
   */
  #postDescriptors = [];

  /**
   * Error Descriptor executed when an error is thrown.
   * @type ErrorDescriptor
   */
  #errorDescriptor;

  /**
   * @param {DescriptorObject} descriptorObject
   */
  constructor(descriptorObject) {
    super(descriptorObject);

    if (
      descriptorObject.preDescriptors &&
      (
        typeof descriptorObject.preDescriptors !== "object" ||
        !Array.isArray(descriptorObject.preDescriptors) ||
        descriptorObject.preDescriptors.some((descriptor) => !(descriptor instanceof PreDescriptor))
      )
    ) {
      throw new Error("All pre descriptors must be PreDescriptor instances.");
    }

    if (
      descriptorObject.postDescriptors &&
      (
        typeof descriptorObject.postDescriptors !== "object" ||
        !Array.isArray(descriptorObject.postDescriptors) ||
        descriptorObject.postDescriptors.some((descriptor) => !(descriptor instanceof PostDescriptor))
      )
    ) {
      throw new Error("All post descriptors must be PostDescriptor instances.");
    }

    this.#preDescriptors = this.#preDescriptors.concat(descriptorObject.preDescriptors || []);
    this.#postDescriptors = this.#postDescriptors.concat(descriptorObject.postDescriptors || []);
  }

  /**
   * Sets the error descriptor.
   * @param {ErrorDescriptor} errorDescriptor
   */
  setErrorDescriptor(errorDescriptor) {
    if (!(errorDescriptor instanceof ErrorDescriptor)) {
      throw new Error("Error descriptor can only be instances of ErrorDescriptor");
    }

    this.#errorDescriptor = errorDescriptor;
  }

  /**
   * Adds another pre descriptor.
   * @param {PreDescriptor} descriptors
   */
  addPreDescriptors(...descriptors) {
    if (descriptors.some((descriptor) => !(descriptor instanceof PreDescriptor))) {
      throw new Error("Parameter 'descriptor' must be an instance of PreDescriptor.");
    }

    this.#preDescriptors.push(...descriptors);
  }

  /**
   * Adds another post descriptor.
   * @param {PostDescriptor} descriptors
   */
  addPostDescriptors(...descriptors) {
    if (descriptors.some((descriptor) => !(descriptor instanceof PostDescriptor))) {
      throw new Error("Parameter 'descriptor' must be an instance of PostDescriptor.");
    }

    this.#postDescriptors.push(...descriptors);
  }

  // noinspection JSCheckFunctionSignatures
  /**
   * Handle an incoming stream.
   * @param {ServerHttp2Stream} stream
   * @param {IncomingHttpHeaders} headers
   * @param {number} flags
   * @param {StreamContext} context
   * @return {Promise<void>}
   */
  async handle(stream, headers, flags, context) {
    try {
      for (const descriptor of this.#preDescriptors) {
        if (!context.done) {
          await descriptor.handle(stream, headers, flags, context);
        }
      }

      await super.handle(stream, headers, flags, context);

      for (const descriptor of this.#postDescriptors) {
        await descriptor.handle(stream, headers, flags, context);
      }
    } catch (error) {
      if (!this.#errorDescriptor) {
        throw error;
      }

      await this.#errorDescriptor.handle(stream, headers, flags, context, error);
    }
  }
}

export class PreDescriptor extends BasicDescriptor {}

export class PostDescriptor extends BasicDescriptor {}

export class ErrorDescriptor extends BasicDescriptor {
  handle(stream, headers, flags, context, error) {
    return super.handle(stream, headers, flags, context, error);
  }
}
