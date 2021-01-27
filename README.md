# HTTP/2 (Micro)Service Server Framework

## Motivation

HTTP/2 is one of the newer standards in the HTTP protocol alongside HTTP1.1 and HTTP/3. Just like HTTP1.1 it uses TCP
for data communication with the clients. The major difference between 1.1 and 2 being that the clients have usually one
single connection (called session) with the servers; meanwhile the multiple requests are being processed as streams.
HTTP/2 also does handle multiplexing at its core; allowing servers and clients to communicate as if the requests were
handled separately. One huge advantage for going down this route, is that the whole session is being handled in a single
connection and allows the server to hold information for the whole browsing session for that particular client.

Meanwhile, there's a whole plethora of server software that support HTTP/2, there are not so many that support the
development of an end to end HTTP2 connection where the developer can use all of its features for the app development.

We are aiming to fill this gap.

## Description

Izvor is an ESM library / framework made to help with the organising of a HTTP/2 micro-service server.

It is not intended at the moment as a replacement for express or anything similar. Services written with this server
must be directly access and have no routing done at Network Layers higher than 4 (NAT)

In this document you'll find:

- [Getting started](#getting-started)
- Classes
  - [Daemon](https://github.com/zalter-io/izvor/blob/main/docs/daemon.md)
  - [Server](https://github.com/zalter-io/izvor/blob/main/docs/server.md)
  - [Service](https://github.com/zalter-io/izvor/blob/main/docs/service.md)
  - [ServiceManager](https://github.com/zalter-io/izvor/blob/main/docs/service-manager.md)
  - [HandlerDescriptor](https://github.com/zalter-io/izvor/blob/main/docs/handler-descriptor.md)
  - [Pre-made HandlerDescriptors](https://github.com/zalter-io/izvor/blob/main/docs/premade-handler-descriptors.md)


# Getting started

## Preliminaries

In order to start the server you'll first have to create or get an __SSL certificate__. The non-profit
organisation [Let's Encrypt](https://letsencrypt.org) provides dv certificates for free.

For development, you can create a [Self-signed certificate](https://en.wikipedia.org/wiki/Self-signed_certificate) with
openssl in a *nix environment as follows:
- first you need to create a private key:
  ```shell
  openssl genrsa -des3 -out key.pem 2048
  ```
- then generate a CSR (Certificate Signing Request)
  ```shell
  openssl req -new -key key.pem -out request.csr
  ```
- now you can Sign the certificate
  ```shell
  openssl x509 -req -days 365 -in request.csr -signkey key.pem -out certificate.pem
  ```

Since self-signed certificates don't use a chain all you need is the `certificate.pem` file and the `key.pem` file.

You need to install __node.js__ *v15.6+*, and be prepared to deploy your software on a L4 balanced setup rather than a
L7 to benefit from all the features.

## Installing

Starting from the assumption you've already installed the latest version of Node.js (15.6 or higher); you can get
started with a project just like any other node / npm project:

```shell
$> mkdir appName
$> cd appName
$> npm init -y
```

You'll now have a ```package.json``` file in your folder.

Edit this file using your favourite editor changing the main file like for example:

```json
{
  "main": "src/index.mjs"
}
```

Please, make sure that you use .mjs file extension, in order to be able to use ESM in your project. Save the
package.json file and touch the main file you have chosen.

Next you can install the `izvor` framework in your project

```bash
$> npm install izvor
```

Note: Since you're supposed to use NodeJS v15+ you'll likely have a version of NPM which automatically saves the
dependencies in your package.json file. Check the package.json file for the izvor version.

Now you're ready to write your app.

## Hello world

```javascript
import fs from "fs";
import {
  HandlerDescriptor,
  Server,
  Service,
  ServiceManager
} from "izvor";

const app = new Server({
  ssl: {
    key: fs.readFileSync("/path/to/your/key.pem"),
    cert: fs.readFileSync("/path/to/your/fullchain.pem")
  }
});

const mainServiceManager = new ServiceManager(":path", /^\/(\w*)/);
const defaultService = new Service(":path");

defaultService.setHandlerDescriptor("", new HandlerDescriptor({
  handlerFunction: (stream) => {
    stream.respond({
      ":status": 200
    });
    stream.end("hello world");
  }
}));

mainServiceManager.setService("", defaultService);
app.serviceManager = mainServiceManager;
app.listen();

```
