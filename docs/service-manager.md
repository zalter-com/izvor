# Class: `ServiceManager`
This class is used to organise services in layers and manage the distribution of streams to the designated services.

Instances of this class are created normally with the standard constructor.
This class can be extended.

## Constructing

### Constructor: `new ServiceManager(serviceSelector[, descriptorMatcher])`
 - `serviceSelector` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
     The name of the header used to do matching and selection of the service (can select a `ServiceManager` when chaining).
 - `descriptorMatcher` [\<RegExp\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
     __Optional__  - Regular Expression object used to make the matching take only a part of the header.
     Used in situations where you want to use special HTTP/2 headers like `":path"`

Creates an instance of the `ServiceManager` that will match its stream processors based on the given `serviceSelector` and,
when provided, a regular expression `descriptorMatcher` used to match only a certain portion of the said header.

Please note that in the HTTP/2 standard, everything pertaining to a request is part of its headers.

The `serviceSelector` parameter will be able to do matching on any of the HTTP/2 headers, which includes the special headers.


The `descriptorMatcher` parameter will also be used when chaining; since subsequent `ServiceManager` instances that intend to
use the same `serviceSelector` (like, when you want to do the matching on the `":path"`), will do so on a version of that header
where the portion matched previously has been erased.

Should you choose to use these processed headers, they can be found as part of the `StreamContext` instance sent to each
`descriptor` as well as each subsequent `Service` or `ServiceManager`, should you choose to extend these classes.


## Methods

### Method: `enableAltSvc(svcHeaderString [, enableCORS])`
 - `altSvcHeaderValue` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
    an [Alt-Svc header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Alt-Svc) value like:
     `h2=":443"; ma=3600, h3-25=":443"; ma=2592000`
 - `[enableCORS=true]` [\<boolean\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean) | [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) By default, it's `true`.
    - `[Access-Control-Allow-Origin="*"]` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) A valid value for [Access-Control-Allow-Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin) header. By default, it's `"*"`
    - `[Access-Control-Allow-Headers="*"]` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) A valid value for [Access-Control-Allow-Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers) header. By default, it's `"*"`
    - `[Access-Control-Allow-Methods="*"]` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) A valid value for [Access-Control-Allow-Methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Methods) header. By default, it's `"*"`
    - `[Access-Control-Allow-Credentials=false]` [\<boolean\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean) A valid value for [Access-Control-Allow-Credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials) header. By default, it's `false`

Enables HTTP/2 specific ALT-SVC header which is used to advertise alternative services through which the same resource
can be reached. The alternative service is defined by a protocol host port combination and is a precursor to enable the
CORS. This is usually made to enable "CORS" for the service thus it also enables CORS handling; by default.

`altSvcHeaderValue` is needed to allow the service to advertise it provides "CORS". By default, its value should be just
`h2=":443"` or whatever your outside port number is.

`enableCORS` value is `true` by default, but you can provide an object containing the CORS Headers. Some values explained above
are used if none provided for those headers.

Commonly used like:
```javascript
serviceManager.enableAltSvc(`h2=":${env.OUTSIDE_PORT}`);
```

### Method: `setService(marker, service)`
- `marker` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
    The value it's going to use in order to trigger running this service. If you're using a full header it's going to match
    it as a whole, otherwise it's going to match the capture group provided in the regular expression.
- `service` [\<Service\>](service.md) An instance of the service you want to be running on this marker.

When provider with an empty string on the `marker` parameter, the `Service` instance will be invoked when nothing else can be
matched. Consider this a "default".

This method will set the provided service in the `ServiceManager` list of stream processors for the selected `marker`.
This service will be invoked When incoming stream requests match the header value or capture group of the header to the
`marker` value once the server is listening for requests.

> __This method will replace the existing service when called multiple times for the same `marker` value.__


For example, if you have a `ServiceManager` instance that was created with

```javascript
const serviceManager = new ServiceManager("X-My-Header");
```

and you set a service with:

```javascript
serviceManager.setService("test", myServiceInstance);
```

it's going to try to handle stream requests that have the following headers:

```json
{
  "X-My-Header": "test"
}
```

thus matching it in its entirety.

On the other hand if you have a `ServiceManager` created with

```javascript
const serviceManager = new ServiceManager("X-My-Header", /^\/v=(\w+)/);
```

and you set a service with:

```javascript
serviceManager.setService("test", myServiceInstance);
```

it's going to try to handle stream requests that have the following headers:

```json
{
  "X-My-Header": "/v=test"
}
```

or, if chaining is used, depending on whether the previous chains were done on the same header with the same format,
something along the lines of:

```json
{
  "X-My-Header": "/v=first/v=second/v=test"
}
```

provided that the currently processed `ServiceManager` is the third in the chain sequence.

### Method: `setSubManager(marker, serviceManager)`

- `marker` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) See [setService](#method-setservicemarker-service)
- `service` [\<ServiceManager\>](#class-servicemanager) An instance of the `ServiceManager` you want to be invoked for this marker.

> __This method will replace the existing (sub) service manager when called multiple times for the same `marker` value.__

Just like [\<setService\>](#method-setservicemarker-service), this method sets a `ServiceManager` to run in a chain
sequence for processing requests on multiple levels. Read above for a basic understanding on the effects of the marker.

This method is used to provide functionality similar to path based routing in HTTP/1.1 server frameworks just like in
this example:

```javascript
// The system is using one single capture group but does replacement for the matched as a whole.
const firstElementRegExp = /^\/(\w+)/;

const serviceManager = new ServiceManager(":path", firstElementRegExp);
const userServiceManager = new ServiceManager(":path", firstElementRegExp);

serviceManager.setSubManager('user', userServiceManager);
```
