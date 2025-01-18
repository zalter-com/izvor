import { constants as http2Constants } from "http2";
import { PreDescriptor } from "../descriptor.mjs";

const {
  HTTP2_HEADER_CONTENT_TYPE
} = http2Constants;

export class JSONPreDescriptor extends PreDescriptor {
  constructor() {
    super({
      handler: (stream, headers, flags, context) => {
        return new Promise((resolve, reject) => {
          if (
            !stream.readable ||
            context.done ||
            headers[HTTP2_HEADER_CONTENT_TYPE] !== "application/json"
          ) {
            return;
          }

          let jsonString = "";
          let cleanup;

          const onData = (chunk) => {
            jsonString += chunk;
          };

          const onceError = (error) => {
            cleanup();
            reject(error);
          };

          const onceEnd = () => {
            context.rawBody = jsonString;

            try {
              context.body = JSON.parse(jsonString);
              cleanup();
              resolve();
            } catch (err) {
              console.error("Couldn't parse the JSON.", err);
              cleanup();
              reject(err);
            }
          };

          cleanup = () => {
            stream.removeListener("data", onData);
            stream.removeListener("error", onceError);
            stream.removeListener("end", onceEnd);
          };

          stream.on("data", onData);
          stream.once("error", onceError);
          stream.once("end", onceEnd);
        });
      }
    });
  }
}
