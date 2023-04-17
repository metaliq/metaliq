## The Meta-Graph

You have seen that MetaliQ solutions consist of MetaModels that provide additional information about data model types in the terms defined by policies. These MetaModels are made using the generic type `MetaModel`.

```ts
export const contactModel: MetaModel<Contact> = {
  label: "Contact Details",
  fields: {
    name: {
      label: "Name",
      validator: isNotBlank("You must enter your name")
    }
  },
  init: {
    name: ""
  }
}
```

### Value Initialisation

A MetaModel's `init` term can provide an initial value of the MetaModel's related type - either as a hard-coded value as shown above, or a synchronous or asynchronous function to obtain such a value. When a MetaModel is run, an initial value is created using its `init` term. We call the object that is produced the *underlying data value*. The `init` process is recursive, drilling down into child fields until a level where a value is returned by that field's MetaModel.

In many cases, our application code (processes, views and functional terms such as validators) can work with this value object - and any further nested value objects - directly, by inspecting and assigning values within it. But in addition to this basic value graph MetaliQ builds a parallel "Meta-Graph", which can sometimes be very useful.  

### Meta Objects

Having established the underlying data value of the top-level type and it's descendant types - the branches and leaves of the overall value object graph - MetaliQ goes on to create a `Meta` object for the value. A meta object contains two things. Firstly it contains a special key called `$` which holds some references which we'll see below. Secondly it contains entries for each of the fields that were included in the MetaModel, and each of those entries is itself a `Meta` object for that field's value.

In this way, the underlying object graph that represents the current state of the system's data model - both initially and at any later time as it runs - is reflected by a parallel graph of `Meta` objects.

It is fairly simple to navigate from any part of the Meta graph to the related point in the underlying value graph, by using the `value` key of the Meta's `$` property. Indeed, you can skip from Meta to Value from any point in the graph, so the following would all provide a reference to the same object within the underlying data value:

```ts
meta.$.value.account.owner
meta.account.$.value.owner
meta.account.owner.$.value
```

The point of this parallel Meta graph is to be able to hold additional information (meta-information) about any individual level of value in the overall data being managed by the system. This is held within the `$` property.

### Meta$

The `$` key of any Meta object is of type Meta$ and contains the following references.

* `meta`

This is a reference back to the Meta object itself (the object containing this `$` key) which can be useful for backlinks from value objects. This will be discussed more below.

* `parent`

If this Meta object is a child of another Meta object, the `parent` key provides a reference to the parent Meta info (`Meta$`) object.

* `key`

If this Meta object is a child of another Meta object, this is its key within the parent.

* `model`

This is a reference to the `MetaModel` with which this Meta was created.

* `state`

This is a container for additional runtime state for this particular Meta instance. We have seen previously that Policies define the Terms for MetaModels. They can also define, intialise and manage aspects of the meta State.

* `value`

This is a reference to the underlying data value that this Meta is based on.

### The advantages of using Meta objects

Meta objects enable the approach of defining generic system components and behaviours within policies. MetaliQ creates Meta objects for each field within each level of the MetaModel, so they may each contain a reference to their related model along with all its information and functionality (such as a field-specific validation function) as well as their own policy-managed state (such as any current error message for that field). This helps solve many real-world challenges in solution development. 

But you might wonder whether it really makes sense to add this additional layer of complexity to the runtime state of an application. If the functionality provided by the Meta object is mainly contained within the `$` key, then why not just add that `$` key to the raw value objects themselves and access the meta-information directly from there?

Well, that would be fine for most objects, and indeed MetaliQ does actually add the `$` reference to the value object too, providing a simple way to link from underlying values across to their associated Metas (with a few caveats which we'll cover below). But that wouldn't work for primitive values - strings, numbers and booleans - which can't have additional properties. And these "leaf" values are often the very levels within the data model where meta model terms (for example the validation rules for a specific email field) and meta state (such as the error message generated when the user tabbed out of that specific field) are most useful.

One other feature of having a parallel graph of Meta objects is that a single value object can be referenced at different points in the graph by different Meta objects, and thus be linked to different MetaModels. We'll see how this can be useful further below.

### When to use the Meta or the Value?

Althought the Meta does reflect the original data structure, we've seen that the underlying values need to be accessed via `$.value`, and any properties of the underlying data which don't have an entry in the `fields` section of the MetaModel on which the Meta was based will not have an associated place in the Meta graph. Often, you just don't need any of the additional meta-information that might be associated with data, and you prefer to deal directly with the underlying data object.

### Meta Functions

There is a common pattern, often seen within the MetaModel terms defined by various policies called a MetaFunction (referred to in code as a `MetaFn`). This takes two parameters. The first is the underlying value, and the second is the `Meta$` object for that value.

For example the `view` term of the presentation policy takes a template function defined as a `MetaFn<T, P, ViewResult>`. The T and P generic types are the underlying type and parent type of the related meta, and `ViewResult` is the result type - which can be a `html` template result, a plain string, or an array of either. There is an alias for a `MetaFn` with return type `ViewResult`, called a `MetaView`.  You could make a MetaView that only uses the underlying data type:

```typescript
const contactView: MetaView<Contact> = contact => html`
	<div>First Name: ${contact.firstName}</div
	<div>Last Name: ${contact.lastName}</div>
`
```

Or you could utilise the second parameter, the meta object, in order to access meta information from the model or state, such as the field's label:

```typescript
const labelledContactView: MetaView<Contact> = (contact, mContact) => html`
	<h2>${mContact.$.model.label}</h2>
	<div>${contact.firstName} ${contact.lastName}</div>
`
```

### Linking back from values to Metas

As mentioned above, all value objects are assigned a `$` reference to the Meta's `$` property when a Meta is initialised (or reset) to that value. In this way, you can go from meta to value with `meta.$.value` and back again with `value.$.meta`.

This can be useful in various cases, when you are mainly interested in working with the plain value but have some need for a piece of information from the Meta. However, there are a few caveats to consider.

The `$` property on your value objects is added by the "magic" of JavaScript's dynamic objects. Given that your code is TypeScript, and the `$` property did not exist on your original type, the compiler will complain if you try to access it without casting it to a suitable type. You can do this either with a type cast such as this:

```ts
const personWith$ = <unknown>person as Meta$<Person>
const personModel = personWith$.$.model
```

Or you can use the shortcut function `meta`

* meta

The `meta` function can take any value object and give you its Meta object, suitably typed in such a way that the TypeScript compiler will know what type it is. So you could do the same as the above code with:

```ts
const personModel = meta(person).$.model
```

In either case, `personModel` will be inferred by the compiler to have the type `MetaModel<Person>`.

* ... but this won't work for primitives

When the Meta is for a primitive value, there is no way to get back from the value itself (a string or boolean, for example) to the Meta or anything else, as primitives can't have properties. (We did consider trying to force all primitives to be instances of their associated object types, such as String or Boolean, but it is not robust in practice to guard against them being set to other primitive values.)

* ... and it may not work if you have multiple Metas associated with the same value object

But there are practices to follow if you need to do that, described in the next section.

### Sharing underlying data between Metas

Sometimes it makes sense for a single underlying object within your data value graph to be referenced from multiple separate Metas. These could be produced from MetaModels for various stages of working with the same data in different parts of an application, such as a wizard-style user interface for example, where multiple pages have separate models based on the overall data type that is the subject of the whole wizard. Each of these Metas can seamlessly maintain their own link to the same underlying data value object, applying their own meta-information to it, holding their own validation state etc. But the value object itself can only have a single `$` property, and can thus only back-link to a single Meta.

This turns out not to be a big problem though, even if you do need to use back-links, as the value object's `$` property is reset whenever the `reset` function is called on a particular Meta. This happens automatically at the end of every application update cycle when you are using `up`. So if the Meta that is to be used in the new state of an application is reset as part of that state change process then the back-links for the overall value object will point as expected to the currently relevant Meta. 

### Meta Arrays

We have seen how individual objects and primitive values are reflected in the Meta graph. Arrays are quite similar in how they are handled. A `MetaModel` that is based on an array type rather than an individual object type can have all the same policy-defined terms, but instead of the property `fields` it has the property `items`. This itself is a `MetaModel` that becomes the model for each individual item in the array. Note that if the `items` key of a MetaModel is not specified then the underlying array's values will not have associated entries in the Meta graph. 

At runtime, the Meta object of an array has the same `$` key as other Meta objects, with the same internal references including `$.value` which points to the underlying array with its original values. The Meta array is itself also an array of Meta objects of those original values, each of which is connected to its original value via its `$.value` property. Note that the array item Meta objects have the same `$.parent$` as the array Meta itself. So, for example, if a parent object of type `Submission` had a field `contacts` of type `Contact[]`, the type for the  `contacts` field model would be `MetaModel<Contact[], Submission>` and the `items` property within that model would be `MetaModel<Contact, Submission>`. 
