import { constants as http2Constants } from "http2";
import {
  Descriptor,
  PostDescriptor,
  PreDescriptor,
  ErrorDescriptor
} from "./descriptor.mjs";

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

export default class Service {
  /**
   * The header this service is using to identify the descriptor to call.
   * @type {string}
   */
  #descriptorSelector;

  /**
   * Regular expression for selector matching
   * @type {RegExp}
   */
  #descriptorMatcher;

  /**
   * Are the preHandlers executed regardless of whether the service has a handler it can select ?
   * @type {boolean}
   */
  #alwaysExecPreDescriptors = false;

  /**
   * Ordered List of preDescriptors.
   * @type {PreDescriptor[]}
   */
  #preDescriptors = [];

  /**
   * A map containing the handler descriptors for faster access.
   * @type {Map<string, Descriptor>}
   */
  #descriptors = new Map();

  /**
   * Ordered List of postDescriptors.
   * @type {PostDescriptor[]}
   */
  #postDescriptors = [];

  /**
   * Error Handler Descriptor executed when an error is thrown.
   * @type ErrorDescriptor
   */
  #errorDescriptor;

  /**
   * @param {string} descriptorSelector The header where you want the Stream Manager to look for its handler selection.
   * @param {RegExp} [descriptorMatcher] RegExp with exactly one capturing group.
   * @param {boolean} alwaysExecPreDescriptors Whether or not to execute the pre descriptors regardless of whether the service has a handler for the selected marker.
   */
  constructor(descriptorSelector, descriptorMatcher = undefined, alwaysExecPreDescriptors = false) {
    if (!descriptorSelector) {
      throw new Error("Descriptor selector must be set.");
    }

    if (descriptorMatcher && !descriptorMatcher instanceof RegExp) {
      throw new Error("Descriptor matcher must be a regular expression and have a capturing group if set.");
    }

    this.#descriptorSelector = descriptorSelector;
    this.#descriptorMatcher = descriptorMatcher;
    this.#alwaysExecPreDescriptors = alwaysExecPreDescriptors;
  }

  /**
   * Sets the error descriptor
   * @param {ErrorDescriptor} errorDescriptor
   */
  setErrorDescriptor(errorDescriptor) {
    if (!(errorDescriptor instanceof ErrorDescriptor)) {
      throw new Error("Error descriptor can only be instances of ErrorDescriptor.");
    }

    this.#errorDescriptor = errorDescriptor;
  }

  /**
   * Adds a handler descriptor.
   * @param {string} marker
   // Not sure... probably? * @param {Descriptor | PreDescriptor | PostDescriptor} descriptor
   * @param {Descriptor} descriptor
   */
  setDescriptor(marker, descriptor) {
    if (typeof marker !== "string") {
      throw new Error("Markers values MUST be strings");
    }

    if (!(descriptor instanceof Descriptor)) {
      throw new Error("Descriptor must be an instance of Descriptor.");
    }

    if (!marker) {
      this.#descriptors.set("", descriptor);
      return;
    }

    this.#descriptors.set(marker, descriptor);
  }

  /**
   * Adds a pre descriptor.
   * @param {PreDescriptor} descriptors
   */
  addPreDescriptors(...descriptors) {
    if (descriptors.some((descriptor) => !(descriptor instanceof PreDescriptor))) {
      throw new Error("Descriptor must be an instance of PostDescriptor.");
    }

    this.#preDescriptors.push(...descriptors);
  }

  /**
   * Adds a post descriptor.
   * @param {PostDescriptor} descriptors
   */
  addPostDescriptors(...descriptors) {
    if (descriptors.some((descriptor) => !(descriptor instanceof PostDescriptor))) {
      throw new Error("Descriptor must be an instance of PostDescriptor.");
    }

    this.#postDescriptors.push(...descriptors);
  }

  /**
   * @param {ServerHttp2Stream} stream
   * @param {Object<string, *>} headers
   * @return {Descriptor}
   */
  #getSelectedDescriptor(stream, headers) {
    if (this.#descriptorMatcher) {
      const matchResult = headers[this.#descriptorSelector].match(this.#descriptorMatcher);

      if (!matchResult) {
        stream.respond(
          { [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR },
          { endStream: true }
        );
        console.error(`The descriptor selector "${this.#descriptorSelector}" had a value of "${headers[this.#descriptorSelector]}" which did not match "${this.#descriptorMatcher}"`);
        return null;
      }

      const matchedDescriptor = this.#descriptors.get(matchResult[1]);

      if (matchedDescriptor) {
        headers[this.#descriptorSelector] = headers[this.#descriptorSelector].replace(this.#descriptorMatcher, "");
      }

      return matchedDescriptor;
    }

    return this.#descriptors.get(headers[this.#descriptorSelector]);
  }

  /**
   * @param {ServerHttp2Stream} stream
   * @param {IncomingHttpHeaders} headers
   * @param {number} flags
   * @param {StreamContext} context
   */
  async handle(stream, headers, flags, context) {
    const selectedDescriptor = this.#getSelectedDescriptor(stream, context.processedHeaders);

    try {
      if (selectedDescriptor || this.#alwaysExecPreDescriptors) {
        // I think pre descriptors should be executed only if there's a handler found, otherwise execute only the post descriptors?
        for (const descriptor of this.#preDescriptors) {
          await descriptor.handle(stream, headers, flags, context);
        }

        if (selectedDescriptor) {
          await selectedDescriptor.handle(stream, headers, flags, context);
        }
      }

      for (const descriptor of this.#postDescriptors) {
        await descriptor.handle(stream, headers, flags, context);
      }
    } catch (err) {
      if (!this.#errorDescriptor) {
        throw err;
      }

      await this.#errorDescriptor.handle(stream, headers, flags, context, err); // won't catch since if an error goes here...
    }
  }
}
