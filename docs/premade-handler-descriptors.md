# Pre-Made HandlerDescriptor objects:

## Class: `GeneralErrorHandlerDescriptor`

Is an `ErrorHandlerDescriptor` implementation that prints the error in the error stdout (
via [`console.error`](https://developer.mozilla.org/en-US/docs/Web/API/Console/error))
and responds with 500, while also closing the stream. Should be used in your service on
the [`service.setErrorHandlerDescriptor`](service.md#method-seterrorhandlerdescriptorerrorhandlerdescriptor)
or
the [`handlerDescriptor.setErrorHandlerDescriptor`](handler-descriptor.md#method-seterrorhandlerdescriptorerrorhandlerdescriptor)

## Decorator: `setFileHandlerToDescriptor(basePath, handlerDescriptorInstance)`

- `basePath` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
- `handlerDescriptorInstance` [\<HandlerDescriptor\>](handler-descriptor.md#class-handlerdescriptor) |
  [\<PreHandlerDescriptor\>](handler-descriptor.md#class-prehandlerdescriptor) |
  [\<PostHandlerDescriptor\>](handler-descriptor.md#class-posthandlerdescriptor) instance.

Is an object decorator that adds
a [`HandlerFunction`](handler-descriptor.md#callback-handlerfunctionstream-headers-flags-context-additionalparams)
to do the handling of file serving. The `basePath` parameter will dictate where the files are to be found. The path is
relative to the project root.

## Class: `FilePreHandlerDescriptor`

A class that extends [`PreHandlerDescriptor`](handler-descriptor.md#class-prehandlerdescriptor) which does basic file
handling.

### Constructor: `new FilePreHandlerDescriptor(basePath)`

- `basePath` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
  Constructs the object with the provided `basePath`.

> Internally it decorates it with the [`setFileHandlertoDescriptor`](#decorator-setfilehandlertodescriptorbasepath-handlerdescriptorinstance)

## Class: `FilePostHandlerDescriptor`

A class that extends [`PostHandlerDescriptor`](handler-descriptor.md#class-posthandlerdescriptor) which does basic file
handling. This is, probably, the most used class when it comes to the file handling.

### Constructor: `new FilePostHandlerDescriptor(basePath)`

- `basePath` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
  Constructs the object with the provided `basePath`.

> Internally it decorates it with the [`setFileHandlertoDescriptor`](#decorator-setfilehandlertodescriptorbasepath-handlerdescriptorinstance)

## Class: `JSONPreHandlerDescriptor`

A `PreHandlerDescriptor` that processes the incoming stream readable part, and tries to do JSON.parse on the string
body.

### Constructor `new JSONPreHandlerDescriptor(throwOnError)`

- `throwOnError` [\<boolean\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)

## Decorator: `setNotFoundToDescriptor(handlerDescriptorInstance)`

- `handlerDescriptorInstance` [\<HandlerDescriptor\>](handler-descriptor.md#class-handlerdescriptor) |
  [\<PreHandlerDescriptor\>](handler-descriptor.md#class-prehandlerdescriptor) |
  [\<PostHandlerDescriptor\>](handler-descriptor.md#class-posthandlerdescriptor) instance.

Decorates the provided instance to set its handlerFunction to respond with 404 not found in case the stream headers were
not sent and the `context.done` wasn't set to `true`

## Class: `NotFoundPreHandlerDescriptor`

A `PreHandlerDescriptor` that was decorated
with [`setNotFoundToDescriptor`](#decorator-setnotfounddescriptorhandlerdescriptorinstance)

## Class: `NotFoundPostHandlerDescriptor`

A `PostHandlerDescriptor` that was decorated
with [`setNotFoundToDescriptor`](#decorator-setnotfounddescriptorhandlerdescriptorinstance)
