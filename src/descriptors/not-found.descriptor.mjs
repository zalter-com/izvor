import { constants as http2Constants } from "http2";
import { PostDescriptor, PreDescriptor } from "../descriptor.mjs";

const {
  HTTP_STATUS_NOT_FOUND,
  HTTP2_HEADER_STATUS
} = http2Constants;

export function setNotFoundToDescriptor(descriptor) {
  descriptor.setHandler(((stream, headers, flags, context) => {
    if (stream.headersSent || context.done) {
      return;
    }

    stream.respond(
      { [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND },
      { endStream: true }
    );
  }));
}

export class NotFoundPreDescriptor extends PreDescriptor {
  constructor() {
    super({});
    setNotFoundToDescriptor(this);
  }
}

export class NotFoundPostDescriptor extends PostDescriptor {
  constructor() {
    super({});
    setNotFoundToDescriptor(this);
  }
}
