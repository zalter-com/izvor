# Class `Service`

This class is used to organise and manage the distribution of the stream handling descriptors and handle. These are
instances of [\<HandlerDescriptor\>](descriptor-descriptor.md),
[\<PreDescriptor\>](descriptor-descriptor.md#class-prehandlerdescriptor)
and [\<PostDescriptor\>](descriptor-descriptor.md#class-posthandlerdescriptor) classes.

Just like the [\<ServiceManager\>](service-manager.md); the constructor is provided with a header to do the matching against
as well as (where necessary) a regular expression.

## Constructor: `new Service(serviceSelector[, headerRegexp[, alwaysExecPreDescriptors]])`
- `serviceSelector` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
    The name of the header used to do matching and selection of the stream processor.
- `descriptorMatcher` [\<RegExp\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
    __Optional__  - Regular Expression object used to make the matching take only a part of the header.
    Used in situations where you want to use special HTTP/2 headers like `":path"`
- `[alwaysExecPreDescriptors=false]`  [\<boolean\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/boolean)
    Flag for whether the provided `PreDescriptor` are invoked regardless of whether a match could be found.
    Default value: `false`.

For explanation on `serviceSelector` and `headerRegexp` check [ServiceManager constructor](service-manager.md#constructor-new-servicemanagerheadername-headerregexp).

The `alwaysExecPreDescriptors` is the only special flag about the `Service` constructor and is used to change the behaviour
around executing the `PreDescriptor` when no `HandlerDescriptor` can be matched. The default value of `false` means
that the `PreDescriptor` instances are not invoked and, thus, one should not expect their effects when running the
`PostDescriptor` instances.

## Methods

### Method: `setHandlerDescriptor(marker, handlerDescriptor)`
- `marker` [\<string\>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
    See [ServiceManager.setService](service-manager.md#method-setservicemarker-service)
- `handlerDescriptor` [\<HandlerDescriptor\>](descriptor-descriptor.md) An instance of the `HandlerDescriptor` you want to be invoked for this marker.

Sets an instance of `HandlerDescriptor` to be invoked when the value of `marker` parameter is matched against the `serviceSelector`
provided during instantiation of the `Service`.

### Method: `addPreHandlerDescriptors(preHandlerDescriptor[, ...preHandlerDescriptor])`
- `preHandlerDescriptors` [\<PreDescriptor\>](descriptor-descriptor.md#class-prehandlerdescriptor) instance

Adds a `PreDescriptor` in an ordered array (first in first run), to be run prior to the execution of a
`HandlerDescriptor`. This is going to be run only when a `HandlerDescriptor` could be matched, unless one sets the
`alwaysExecPreDescriptors` to `true` during instantiation of the `Service`.

### Method: `addPostHandlerDescriptors(postHandlerDescriptor[, ...postHandlerDescriptor])`
- `preHandlerDescriptors` [\<PostDescriptor\>](descriptor-descriptor.md#class-posthandlerdescriptor) instance

Adds a `PostDescriptor` in an ordered array (first in first run), to be run at the end of the `Service` handling.
This means it's going to run regardless of whether a `HandlerDescriptor` was run or not, which is a very important feature
allowing the developer to create special handling functions like `404` responses.

> **Note:** The system won't automatically respond with 404 or do any handling that the user has not requested on purpose.

### Method: `setErrorHandlerDescriptor(errorHandlerDescriptor)`

- `errorHandlerDescriptor`[\<ErrorDescriptor\>](descriptor-descriptor.md#class-errorhandlerdescriptor)

Sets the descriptor for errors. It will be invoked when an error is thrown, or a promise rejects.
