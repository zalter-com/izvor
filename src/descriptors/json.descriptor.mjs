import { constants as http2Constants } from "http2";
import { PreDescriptor } from "../descriptor.mjs";

const {
  HTTP2_HEADER_CONTENT_TYPE
} = http2Constants;

export class JSONPreDescriptor extends PreDescriptor {
  constructor(throwOnError) {
    super({
      handler: (stream, headers, flags, context) => {
        if (
          !stream.readable ||
          context.done ||
          headers[HTTP2_HEADER_CONTENT_TYPE] !== "application/json"
        ) {
          return;
        }

        let jsonString = "";

        stream.on("data", (chunk) => {
          jsonString += chunk;
        });

        stream.once("end", () => {
          context.rawBody = jsonString;

          try {
            context.body = JSON.parse(jsonString);
          } catch (e) {
            console.error("Couldn't parse the JSON.", e);

            if (throwOnError) {
              throw e;
            }
          }
        });
      }
    });
  }
}
