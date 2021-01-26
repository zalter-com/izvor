import { PreHandlerDescriptor } from "../index.mjs";
import { constants as http2Constants } from "http2";
const {
	HTTP2_HEADER_CONTENT_TYPE,
	HTTP2_HEADER_STATUS,
	HTTP_STATUS_UNPROCESSABLE_ENTITY
} = http2Constants;

export class ValidatePreHandlerDescriptor extends PreHandlerDescriptor{
	#validator;

	/**
	 * Constructs
	 * @param {Validator} validator
	 * @param {number} failStatusCode
	 */
	constructor(validator, failStatusCode = HTTP_STATUS_UNPROCESSABLE_ENTITY) {
		super({
			handler: async (stream, headers, flags, context) => {
				const validationResult = await this.#validator.validate(headers, context);

				if(validationResult.error){
					stream.respond({
						[HTTP2_HEADER_STATUS]: failStatusCode,
						[HTTP2_HEADER_CONTENT_TYPE]: "application/json"
					});
					stream.end(JSON.stringify({
						validationResult
					}));
				}
			}
		});

		this.#validator = validator
	}
}

export class Validator {
	/**
	 * Implement(override) this method without calling the super.validate.
	 * @abstract
	 * @param {IncomingHttpHeaders} headers
	 * @param {StreamContext} context
	 */
	validate(headers, context){
		throw new Error("Implement this but don't call the super.validate");
	}
}
