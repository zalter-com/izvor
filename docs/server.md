# Class: `Server`
An instance of the __Izvor__ `Server` Class creates an HTTP/2 Secure Server. Requires the key and certificate to be
created and exposes a listen function as well as the ability to set a ServiceManager instance for the purpose of
processing stream requests

## Constructing

### new Server(options)
- `options` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) *Required*
  - `ssl` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) *Required*
    - `key` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/string) *Required*
      The ssl key string in PEM format.
    - `cert`[\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/string) *Required*
      The ssl certificate string in PEM format.

```javascript
const server = new Server({
  ssl: {
    key: fs.readFileSync("../path/to/your/privkey.pem"),
    cert: fs.readFileSync("../path/to/your/fullchain2.pem")
  }
});
```
## Events

### Event:  `"listen"`
The event "listen" is emitted when the http/2 server is able to listen to sessions and streams on its listed ports.
```javascript
server.on("listen", () => {
  console.error("Server started listening.: ", err);
});

```
### Event: `"error"`
The event "error" is emitted when an error of any description happened in the server. The error is passed as a parameter.

```javascript
server.on("error", (err) => {
  console.error("Server error: ", err);
});
```

### Event: `"session"`

The event is emitted when a session is established with a remote. The session and sessionContext are sent  as parameters.

```javascript
server.on("session", (session, sessionContext) => {
  sessionContext.myCounter = (sessionContext.myCounter || 0) + 1;
  console.log("session started ... ", session.socket.remoteAddress);
});
```
### Event: `close`

This event is emitted when the server closed
```javascript
server.on("close", () => {
  console.info("Server close.");
});

```
## Properties

### Property: `serviceManager`
- *[\<ServiceManager\>](service-manager.md)*

Writable property to set the entry `ServiceManager` for the server.

This can be set just like setting any other property but accepts only an instance of [\<ServiceManager\>](service-manager.md).

## Methods

### Method: `listen([port][, host])`
- `port` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/number)
  Specifies the port number on which the service will be open. By default, it'll open on port 3000.
- `host` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/string)
  Specifies the host on which to start listening. This determines the interface. By default, it'll start on "localhost"


```javascript
server.listen(8080, "0.0.0.0")
```
