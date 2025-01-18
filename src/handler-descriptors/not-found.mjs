import { constants as http2Constants } from "http2";
import { PostHandlerDescriptor, PreHandlerDescriptor } from "../handler-descriptor.mjs";

const {
  HTTP_STATUS_NOT_FOUND,
  HTTP2_HEADER_STATUS
} = http2Constants;

export function setNotFoundToDescriptor(handlerInstance) {
  handlerInstance.setHandlerFunction(((stream, headers, flags, context) => {
    if (stream.headersSent || context.done) {
      return;
    }

    stream.respond(
      { [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND },
      { endStream: true }
    );
  }));
}

export class NotFoundPreHandlerDescriptor extends PreHandlerDescriptor {
  constructor() {
    super({});
    setNotFoundToDescriptor(this);
  }
}

export class NotFoundPostHandlerDescriptor extends PostHandlerDescriptor {
  constructor() {
    super({});
    setNotFoundToDescriptor(this);
  }
}
