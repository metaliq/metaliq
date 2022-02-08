## Value and Meta Objects

You have seen that MetaliQ solutions consist of specifications that provide additional information about data model types in the terms defined by policies. These specifications are made using the generic type `MetaSpec`.

```ts
export const contactSpec: MetaSpec<Contact> = {
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

A specification's `init` term can provide an initial value of the specification's related type - either as a hard-coded value as shown above, or a synchronous or asynchronous function to obtain such a value. When a specification is run, an initial value is created using its `init` term. We call the object that is produced the *underlying data value*.

### Meta Objects

Having established the underlying data value of the top-level type and it's descendant types - the branches and leaves of the overall value object graph - MetaliQ goes on to create a `Meta` object for the value. A meta object contains two things. Firstly it contains a special key called `$` which holds some references which we'll see below. Secondly it contains entries for each of the fields that were included in the specification, and each of those entries is itself a `Meta` object for that field's value.

In this way, the underlying object graph that represents the current state of the system's data model - both initially and at any later time as it runs - is reflected by a parallel graph of `Meta` objects.

It is fairly simple to navigate from any part of the Meta graph to the related point in the underlying value graph, by using the `value` key of the Meta's `$` property. Indeed, you can skip from Meta to Value from any point in the graph, so the following would all provide a reference to the same object within the underlying data value:

```ts
meta.$.value.account.owner
meta.account.$.value.owner
meta.account.owner.$.value
```

The point of this parallel Meta graph is to be able to hold additional information (meta-information) about any individual level of value in the overall data being managed by the system. This is held within the `$` property.

### MetaInfo

The `$` key of any Meta object is of type MetaInfo and contains the following references.

* `meta`

This is a reference back to the Meta object itself (the object containing this `$` key) which can be useful for backlinks from value objects. This will be discussed more below.

* `parent`

If this Meta object is a child of another Meta object, the `parent` key provides a reference to the parent Meta.

* `key`

If this Meta object is a child of another Meta object, this is its key within the parent.

* `spec`

This is a reference to the `MetaSpec` with which this Meta was created.

* `state`

This is a container for additional runtime state for this particular Meta instance. We have seen previously that policies define specification terms. They can also define, intialise and manage aspects of the Meta state.

* `value`

This is a reference to the underlying data value that this Meta is based on.

### The advantages of using Meta objects

Meta objects enable the approach of defining generic system components and behaviours within policies. MetaliQ creates Meta objects for each field within each level of the specification, so they may each contain a reference to their related spec along with all its information and functionality (such as a field-specific validation function) as well as their own policy-managed state (such as any current error message for that field). This helps solve many real-world challenges in solution development. 

But you might wonder whether it really makes sense to add this additional layer of complexity to the runtime state of an application. If the functionality provided by the Meta object is mainly contained within the `$` key, then why not just add that `$` key to the raw value objects themselves and access the meta-information directly from there?

Well, that would be fine for most objects, and indeed MetaliQ does actually add the `$` reference to the value object too, providing a simple way to link from underlying values across to their associated Metas (with a few caveats which we'll cover below). But that wouldn't work for primitive values - strings, numbers and booleans - which can't have additional properties. And these "leaf" values are often the very levels within the data model where meta-specifications (for example the validation rules for a specific email field) and meta-state (such as the error message generated when the user tabbed out of that specific field) are most useful.

In addition to being able to manage policy-driven state for each branch and leaf node of the overall data graph, the parallel Meta object gives us a transient version of the primitive data itself. As noted above, the `$.value` of any Meta is its associated underlying data value. In the case of objects within the graph, this is a direct reference to the value object itself. For Metas of primitive values, it is a reference to the primitive value itself. However, because JavaScript makes a new copy every time a reference is assigned to a primitive value, the copy can be altered without changing the original. This gives MetaliQ systems the ability to modify primitive values by their `$.value` reference, and then to choose whether to write these values to the underlying value graph (known as *comitting* the Meta) or to overwrite them with the original values (known as *resetting* the Meta).

Whilst the concepts of comitting or rolling back transactions have long been established in the world of databases, they also turn out to be very useful in many user-facing solutions, where we wish to let people cancel edits, prevent invalid values from being saved and so on.

One other feature of having a parallel graph of Meta objects is that a single value object can be referenced at different points in the graph by different Meta objects. We'll see how this can be useful further below.

### When to use the Meta or the Value?

Althought the Meta does reflect the original data structure, we've seen that the primitive leaf values need to be accessed via `$.value`, and any properties of the underlying data which don't have an entry in the `fields` section of the specification on which the Meta was based will not have an associated place in the Meta graph. Often, you just don't need any of the additional meta-information that might be associated with data, and it may be easier to think and work with the underlying data object. In this case, you can reach it via `$.value` and use it directly without worrying about its associated Meta.

But some policy terms are defined as requiring a Meta, or a function that takes a Meta. For example, the `view` property provided by the standard presentation policy within MetaliQ expects a template function that accepts the Meta itself, not the underlying value object. This can be useful, and indeed is the basis of things such as the MetaliQ form components, which use the meta information to add automatic validation behaviour. But if you're just trying to display a name-and-address card on screen, it can be annoying to have to keep drilling down through `$.value` on every piece of data.

For this reason, MetaliQ provides a few shortcuts to make it easier to switch between working with Meta objects and their associated data values.  

* toString

The `toString` method of a Meta object is defined such that if the Meta has a primitive value then that value is returned as a string (which may be the string version of a number or the string "true" or "false" for a boolean). The `lit` templating system used by the default presentation policy in MetaliQ calls toString if it finds an object embedded in a text node of the HTML, meaning that for display purposes you can often treat the Meta objects as if they were the value objects themselves.

* metaView

If you have a template fuction (or "view") that takes a straightforward data type, then passing it to `metaView` will give you a template function that takes a Meta of that type, which can be used as the `view` term in a specification.

```ts
const contactView = (contact: Contact) => html`
	<div>${contact.firstName} ${contact.lastName}</div>
	<img src=${contact.mugshot} />
`

const contactSpec: MetaSpec<Contact> = {
  view: metaView(contactView)
}
```

* metaFn

Similarly, with any general process function that takes a value of a straightforward data type, passing that process function to `metaFn` returns a `MetaFn` that takes a Meta of that type.

This Process pattern is commonly used in MetaliQ policies, so metaFn is a good way of transforming framework-agnostic business logic code for use in MetaliQ specifications.

```ts
// savePerson is a framework-agnostic piece of business logic
const savePerson = (person: Person) => {
  // Some process code
  db.write(person)
}

// savePersonMeta could be used for example as a navigation route handler in a MetaliQ spec of type Person
const savePersonMeta: MetaFn<Person> = metaFn(savePerson)
```

### Linking back from values to Metas

As mentioned above, all value objects are assigned a `$` reference to the Meta's `$` property when a Meta is initialised (or reset) to that value. In this way, you can go from meta to value with `meta.$.value` and back again with `value.$.meta`.

This can be useful in various cases, when you are mainly interested in working with the plain value but have some need for a piece of information from the Meta. However, there are a few caveats to consider.

The `$` property on your value objects is added by the "magic" of JavaScript's dynamic objects. Given that your code is TypeScript, and the `$` property did not exist on your original type, the compiler will complain if you try to access it without casting it to a suitable type. You can do this either with a type cast such as this:

```ts
const personWith$ = <unknown>person as Meta$<Person>
const personSpec = personWith$.$.spec
```

Or you can use the shortcut function `meta`

* meta

The `meta` function can take any value object and give you its Meta object, suitably typed in such a way that the TypeScript compiler will know what type it is. So you could do the same as the above code with:

```ts
const personSpec = meta(person).$.spec
```

In either case, `personSpec` will be inferred by the compiler to have the type `MetaSpec<Person>`.

* ... but this won't work for primitives

When the Meta is for a primitive value, there is no way to get back from the value itself (a string or boolean, for example) to the Meta or anything else, as primitives can't have properties. (We did consider trying to force all primitives to be instances of their associated object types, such as String or Boolean, but it is not robust in practice to guard against them being set to other primitive values.)

* ... and it may not work if you have multiple Metas associated with the same value object

But there are practices to follow if you need to do that, described in the next section.

### Sharing underlying data between Metas

Sometimes it makes sense for a single underlying object within your data value graph to be referenced from multiple separate Metas. These could be produced from specifications for various stages of working with the same data in different parts of an application. It is a common pattern for building wizard-style user interfaces for example, where multiple pages have separate specs based on the overall data type that is the subject of the whole wizard. Each of these Metas can seamlessly maintain their own link to the same underlying data value object, applying their own meta-information to it, holding their own validation state etc. But the value object itself can only have a single `$` property, and can thus only back-link to a single Meta.

This turns out not to be a big problem though, even if you do need to use back-links, as the value object's `$` property is reset whenever the `reset` function is called on a particular Meta. So if the Meta that is to be used in the new state of an application is reset as part of that state change process then the back-links for the overall value object will point as expected to the currently relevant Meta. 

In the example of a wizard page change, the process first validates the *from* page Meta, then (if validation succeeds)  *commits* that Meta so that its transient, validated values are applied to its underlying data graph, then the *to* page Meta is reset, so that the `$` references throughout its underlying data graph point to the newly relevant Metas and the data values of primitive fields are applied to their transient Meta reflections.

### Meta Arrays

We have seen how individual objects and primitive values are reflected in the Meta graph. Arrays are quite similar in how they are handled. A `MetaSpec` that is based on an array type rather than an individual object type can have all the same policy-defined terms, but instead of the property `fields` it has the property `items`. This itself is a `MetaSpec` that becomes the specification for each individual item in the array. Note that if the `items` key of a MetaSpec is not specified then the underlying array's values will not have associated entries in the Meta graph. 

At runtime, the Meta object of an array has the same `$` key as other Meta objects, with the same internal references including `$.value` which points to the underlying array with its original values. The Meta array is itself also an array of Meta objects of those original values, each of which is connected to its original value via its `$.value` property. Note that the array item Meta objects have the same `$.parent` as the array Meta itself. So, for example, if a parent object of type `Submission` had a field `contacts` of type `Contact[]`, the type for the  `contacts` field specification would be `MetaSpec<Contact[], Submission>` and the `items` property within that specification would be `MetaSpec<Contact, Submission>`. 

If `reset` is called on a Meta array (or a Meta containing it) then the original array values are applied back into the Meta graph, overwriting any transient updates.

If `commit` is called on a Meta array, the original array is mutated to match any updates in the transient Meta array. Any items that were removed in the transient Meta array are removed in the underlying array. Other items are reordered as per the order of their associated Metas in the Meta array, and new items are inserted wherever they have been created in the Meta array.