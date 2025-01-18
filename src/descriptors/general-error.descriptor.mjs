import { constants as http2Constants } from "http2";
import { ErrorDescriptor } from "../descriptor.mjs";

const {
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP2_HEADER_STATUS
} = http2Constants;

export class GeneralErrorDescriptor extends ErrorDescriptor {
  constructor() {
    super({
      handler: (stream, headers, flags, context, error) => {
        console.error("Error occurred during stream processing.", error);

        if (!stream.headersSent) {
          stream.respond(
            { [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR },
            { endStream: true }
          );
        }

        if (!stream.writableEnded) {
          stream.end();
        }
      }
    });
  }
}
