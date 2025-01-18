# Handler descriptors

The handler Descriptors are a type of objects (classes) that are used to define how to handle the incoming stream

There are some [pre-made handler descriptors](premade-handler-descriptors.md) for you to use or expand upon.

---

## Callback: `HandlerFunction(stream, headers, [flags, [context[, ...additionalParams]]])`

- `stream` [\<ServerHttp2Stream\>](https://nodejs.org/dist/latest-v15.x/docs/api/http2.html#http2_class_serverhttp2stream)
  The unmodified incoming stream.
- `headers` [\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  The unmodified incoming headers.
- `flags` [\<number\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/number)
  An 8-[bit flag field](https://en.wikipedia.org/wiki/Bit_field) for HTTP/2 specific stream flags.
- `context` [\<StreamContext\>](context.md#class-streamcontext)
  The stream context data. Contains a [\<SessionContext\>](context.md#class-sessioncontext).
- `...aditionalParams` Additional params to put anything you want.

> If this method returns a promise it will be waited for.

---

# Class: `HandlerDescriptor`

## Constructor: `new HandlerDescriptor(descriptorObject)`

- `descriptorObject`[\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `preHandlers` [\<Array\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) ([PreHandlerDescriptor](#class-prehandlerdescriptor))
  - `postHandlers` [\<Array\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) ([PostHandlerDescriptor](#class-posthandlerdescriptor))
  - `errorHandler` [ErrorHandlerDescriptor](#class-errorhandlerdescriptor)
  - `handlerFunction` [HandlerFunction](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

## Methods

### Method: `setHandlerFunction(handlerFunction)`

- handlerFunction [HandlerFunction](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

Sets the callback to be invoked.

### Method: `addPreHandlerDescriptors(preHandlerDescriptor[, ...preHandlerDescriptor])`

- `preHandlerDescriptor`[\<PreHandlerDescriptor\>](#class-prehandlerdescriptor)

Adds the provided PreHandlerDescriptor(s) to be invoked orderly (first in first run) prior to the `handlerFunction`.

### Method: `addPostHandlerDescriptors(postHandlerDescriptor[, ...postHandlerDescriptor])`

- `postHandlerDescriptor`[\<PostHandlerDescriptor\>](#class-posthandlerdescriptor)

Adds the provided PostHandlerDescriptor(s) to be invoked orderly (first in first run) after the `handlerFunction`.

### Method: `setErrorHandlerDescriptor(errorHandlerDescriptor)`

- `errorHandlerDescriptor`[\<ErrorHandlerDescriptor\>](#class-errorhandlerdescriptor)

Sets the handler for errors. It will be invoked when an error is thrown, or a promise rejects.

---

# Class: `PreHandlerDescriptor`

## Constructor: `new PreHandlerDescriptor(descriptorObject)`

- `descriptorObject`[\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `handlerFunction` [HandlerFunction](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

### Method: `setHandlerFunction(handlerFunction)`

- handlerFunction [HandlerFunction](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

Sets the callback to be invoked.

---

# Class: `PostHandlerDescriptor`

## Constructor: `new PostHandlerDescriptor(descriptorObject)`

- `descriptorObject`[\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `handlerFunction` [HandlerFunction](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

### Method: `setHandlerFunction(handlerFunction)`

- handlerFunction [HandlerFunction](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

Sets the callback to be invoked.

---

# Class: `ErrorHandlerDescriptor`

## Constructor: `new ErrorHandlerDescriptor(descriptorObject)`

- `descriptorObject`[\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `handlerFunction` [HandlerFunction](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

> Note that in this situation, the provided handler function, will receive the error as the additionalParameter

### Method: `setHandlerFunction(handlerFunction)`

- handlerFunction [HandlerFunction](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

Sets the callback to be invoked.
> Note that in this situation, the provided handler function, will receive the error as the additionalParameter
