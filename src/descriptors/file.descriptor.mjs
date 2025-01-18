import fs from "fs";
import mimeTypes from "mime-types";
import { constants as http2Constants } from "http2";
import { PostDescriptor, PreDescriptor } from "../descriptor.mjs";

const {
  HTTP_STATUS_OK,
  HTTP2_HEADER_ACCEPT_ENCODING,
  HTTP2_HEADER_CONTENT_ENCODING,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS
} = http2Constants;

export function setFileHandlerToDescriptor(basePath, handlerInstance) {
  handlerInstance.setHandler(((stream, headers, flags, context) => {
    if (headers[HTTP2_HEADER_METHOD] !== "GET" || stream.headersSent || context.done) {
      return;
    }

    let path = headers[HTTP2_HEADER_PATH].replace(/(\.\.\/)+/, ""); // Security reasons.

    if (path === "/") {
      path = "/index.html";
    }

    let filePath = `${basePath}/${path}`;
    const additionalHeaders = {};

    if (headers[HTTP2_HEADER_ACCEPT_ENCODING]) {
      const encodings = headers[HTTP2_HEADER_ACCEPT_ENCODING].split(",").map(i => i.trim());

      if (encodings.includes("gzip")) {
        if (fs.existsSync(filePath + ".gz")) {
          filePath += ".gz";
          additionalHeaders[HTTP2_HEADER_CONTENT_ENCODING] = "gzip";
        }
      }
    }

    if (fs.existsSync(filePath)) {
      stream.respond(Object.assign({}, {
        [HTTP2_HEADER_CONTENT_TYPE]: mimeTypes.lookup(path) || mimeTypes.lookup("a.txt"),
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK
      }, additionalHeaders));
      fs.createReadStream(filePath).pipe(stream);
    }
  }));
}

export class FilePreDescriptor extends PreDescriptor {
  constructor(basePath) {
    super({});
    setFileHandlerToDescriptor(basePath, this);
  }
}

export class FilePostDescriptor extends PostDescriptor {
  constructor(basePath) {
    super({});
    setFileHandlerToDescriptor(basePath, this);
  }
}
