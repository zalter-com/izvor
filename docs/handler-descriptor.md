# Handler descriptors

The descriptor Descriptors are a type of objects (classes) that are used to define how to handle the incoming stream

There are some [pre-made descriptor descriptors](premade-descriptor-descriptors.md) for you to use or expand upon.

---

## Callback: `Handler(stream, headers, [flags, [context[, ...additionalParams]]])`

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
  - `preHandlers` [\<Array\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) ([PreDescriptor](#class-prehandlerdescriptor))
  - `postHandlers` [\<Array\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) ([PostDescriptor](#class-posthandlerdescriptor))
  - `errorHandler` [ErrorDescriptor](#class-errorhandlerdescriptor)
  - `descriptor` [Handler](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

## Methods

### Method: `setHandlerFunction(descriptor)`

- descriptor [Handler](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

Sets the callback to be invoked.

### Method: `addPreHandlerDescriptors(preHandlerDescriptor[, ...preHandlerDescriptor])`

- `preHandlerDescriptor`[\<PreDescriptor\>](#class-prehandlerdescriptor)

Adds the provided PreDescriptor(s) to be invoked orderly (first in first run) prior to the `descriptor`.

### Method: `addPostHandlerDescriptors(postHandlerDescriptor[, ...postHandlerDescriptor])`

- `postHandlerDescriptor`[\<PostDescriptor\>](#class-posthandlerdescriptor)

Adds the provided PostDescriptor(s) to be invoked orderly (first in first run) after the `descriptor`.

### Method: `setErrorHandlerDescriptor(errorHandlerDescriptor)`

- `errorHandlerDescriptor`[\<ErrorDescriptor\>](#class-errorhandlerdescriptor)

Sets the descriptor for errors. It will be invoked when an error is thrown, or a promise rejects.

---

# Class: `PreDescriptor`

## Constructor: `new PreDescriptor(descriptorObject)`

- `descriptorObject`[\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `descriptor` [Handler](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

### Method: `setHandlerFunction(descriptor)`

- descriptor [Handler](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

Sets the callback to be invoked.

---

# Class: `PostDescriptor`

## Constructor: `new PostDescriptor(descriptorObject)`

- `descriptorObject`[\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `descriptor` [Handler](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

### Method: `setHandlerFunction(descriptor)`

- descriptor [Handler](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

Sets the callback to be invoked.

---

# Class: `ErrorDescriptor`

## Constructor: `new ErrorDescriptor(descriptorObject)`

- `descriptorObject`[\<Object\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `descriptor` [Handler](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

> Note that in this situation, the provided descriptor function, will receive the error as the additionalParameter

### Method: `setHandlerFunction(descriptor)`

- descriptor [Handler](#callback-handlerfunctionstream-headers-flags-context-additionalparams)

Sets the callback to be invoked.
> Note that in this situation, the provided descriptor function, will receive the error as the additionalParameter
