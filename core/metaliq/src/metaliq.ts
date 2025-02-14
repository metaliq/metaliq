/**
 * The Policy namespace holds the interfaces for defining meta model terms and meta state.
 *
 * See one of the included policy modules (such as validation) for a usage example.
 *
 * The convention is for policy interface extensions to appear first in a policy module,
 * followed by policy namespace declaration which merges those interface definitions
 * with the base ones declared here, followed by other policy module members
 * that work with the content of these interfaces.
 */

export declare namespace Policy {
  /**
   * Policies can define Terms to be used in MetaModel definitions.
   */
  export interface Terms<T, P = any> {
    /**
     * Self reference for easy inclusion of generic type parameters when merging.
     */
    this?: Terms<T, P>

    /**
     * Register of policy string literals.
     */
    policies?: string[]
  }

  /**
   * Policies can define and initialise State that will be maintained
   * for each node in the meta-graph.
   */
  export interface State<T, P = any> {
    /**
     * Self reference for easy inclusion of generic type parameters when merging.
     */
    this?: State<T, P>
  }

  /**
   * This interface can be extended by one or more shared value provider Policies
   * to define a set of values that are available to all nodes in the meta graph.
   *
   * This is useful for creating shared lookups (e.g. current user ID) without extended
   * data model traversal, and without reverting to other techniques that reduce
   * testability and reusability such as global object values or module exports.
   *
   * All properties added to this type should be optional,
   * in order that it can be incrementally initialised.
   */
  export interface Shared {
    // Prevent error on empty interface
    this?: Shared
  }
}

/**
 * The MetaModel is the core modelling type in MetaliQ.
 * A MetaModel enhances a given data model Type,
 * along with an optional Parent container type.
 */
export type MetaModel<Type, Parent = any> = Policy.Terms<Type, Parent> & {
  /**
   * If the underlying data Type is an object type, fields contains a collection
   * of nested MetaModels for each model field.
   */
  fields?: Type extends any[]
    ? never
    : MetaModelFields<Type>

  /**
   * If the underlying data type is an array, items contains a single MetaModel
   * which is applied to each item in the array.
   */
  items?: Type extends Array<infer I>
    ? MetaModel<I>
    : never
}

/**
 * The type of the `fields` definition collection in a MetaModel.
 */
export type MetaModelFields<Type> = { [K in FieldKey<Type>]?: MetaModel<Type[K], Type> }

/**
 * A node created in the runtime meta graph,
 * associated with an underlying value of a particular Type in the data graph,
 * optionally within parent container of type Parent.
 * Type can be any type other than an array, for which MetaArrays are used.
 */
export type Meta<Type, Parent = any> = MetaFields<Type> & HasMeta$<Type, Parent>

/**
 * The mapped fields component of a Meta object.
 */
export type MetaFields<Type> = {
  [Key in FieldKey<Type>]: MetaField<Type, Key>
}

/**
 * An individual field within a Meta.
 * Can be another Meta, or a MetaArray.
 */
export type MetaField<Type, Key extends FieldKey<Type>> = Type[Key] extends Array<infer I>
  ? MetaArray<I, Type>
  : Meta<Type[Key], Type>

/**
 * The meta object for an array field,
 * along with a collection of Meta objects associated with its content.
 */
export type MetaArray<Type, Parent = any> = Array<Meta<Type, Parent>> & HasMeta$<Type[], Parent>

/**
 * An object that has a $ property with meta information.
 * Both Meta and MetaArray implement this type.
 */
export type HasMeta$<T, P = any> = { $: Meta$<T, P> }

/**
 * The meta value object, contained within the `$` property of each node in the meta graph.
 * Hence - and for conciseness - the type is written as Meta$, but when we refer to a node's
 * "meta value" this is it. The underlying value within the data graph to which it is linked
 * can be accessed via `$.value`, and can be any type including primitives and arrays.
 */
export class Meta$<T, P = any> {
  /**
   * Link to the node in the meta graph containing this $ property.
   * Used in navigating the metagraph and for backlinks from object values.
   * Although this may be of interest, most solution-focussed code is concerned
   * with the meta value object {@link HasMeta$.$} along with its associated data value ($.value),
   * and navigates to other meta values via the `$.parent$` property and `$.child$`(fieldName).
   */
  meta?: HasMeta$<T, P>

  /**
   * The meta value associated with the immediate ancestor within the meta graph.
   * This will be null for the meta value created at the base level of the
   * running MetaModel.
   */
  parent$?: Meta$<P>

  /**
   * Key within parent node (if applicable).
   * If this node of the graph is in an array then this is the key of the
   * containing array within its parent, and can be used with the `index`
   * property to determine this node's location.
   */
  key?: FieldKey<P>

  /**
   * Holds the full dotted path to this meta node
   * from the root node in the current runtime context meta graph.
   */
  path?: string

  /**
   * Index of parent within meta graph array (if applicable).
   */
  index?: number

  /**
   * The MetaModel associated with this node in the meta graph.
   */
  model: MetaModel<T, P>

  /**
   * The runtime Meta state.
   */
  state: Policy.State<T, P>

  /**
   * The internal version of the data value associated with this node in the meta graph.
   */
  _value?: T

  /**
   * The data value associated with this node in the meta graph.
   */
  get value (): T {
    // Value getter and setter defaults to keyed value within parent object if present,
    // so that primitive values are assigned properly to their place in the containing object.
    if (this.parent$) {
      const parentVal = this.parent$.value
      const parentKey = this.key as keyof P
      const thisVal: any = parentVal?.[parentKey]
      if (typeof this.index === "number") {
        return thisVal?.[this.index]
      } else {
        return thisVal
      }
    } else {
      return this._value
    }
  }

  set value (val: T) {
    this._value = val
    if (this.parent$) {
      const parentVal = (this.parent$.value || (this.parent$.value = {} as P))
      const parentKey = this.key as keyof P
      if (typeof this.index === "number") {
        (parentVal[parentKey] as T[])[this.index] = val
      } else {
        Object.assign(parentVal, { [parentKey]: val })
      }
    }
  }

  on <K extends FieldKey<T>, R = any>(key: FieldKey<T>, metaFn: MetaFn<T[K], T, R>, event?: Event): R {
    const f$ = this.$<K>(key as K)
    return metaFn(f$, event)
  }

  onDescendants (metaFn: MetaFn<T, P>, onThis: boolean = true) {
    onDescendants(metaFn, onThis)(this)
  }

  /**
   * Return the result of the given metafunction or the parameter value if not a function.
   */
  maybeFn <R = any>(metaFnOrValue: MetaFn<T, P, R> | R) {
    return isMetaFn(metaFnOrValue) ? metaFnOrValue(this) : metaFnOrValue
  }

  /**
   * Find the value for the given term. If the term is a meta function
   * its result will be returned - allows for easy configuration of dynamic terms.
   *
   * However, if you need to actually access a meta function term itself, you will
   * need to use the method `raw` instead.
   */
  term <K extends TermKey>(key: K, ancestor?: boolean): DerivedTermValue<K> {
    let t$: Meta$<any> = this
    if (ancestor) {
      while (t$ && typeof t$.model[key] === "undefined") t$ = t$.parent$
    }
    const metaFnOrValue = t$?.model[key]
    return (isMetaFn(metaFnOrValue) ? metaFnOrValue(t$) : metaFnOrValue) as DerivedTermValue<K>
  }

  /**
   * Access a shared values.
   */
  getShared <K extends SharedKey>(
    key: K // TODO: Should be typed as K, but merged keys not recognised. Why?
  ): Policy.Shared[K] { return shared[key as SharedKey] }

  /**
   * Set a shared value within.
   */
  setShared <K extends SharedKey>(
    key: K, // TODO: Should be typed as K extends SharedKey, but merged keys not recognised. Why?
    value: Policy.Shared[K] // TODO: Should be typed as Shared[K], but see above.
  ): MetaFn<any> { return () => {
    shared[key as SharedKey] = value
  }}

  /**
   * Return the raw value of a meta model term, without running it if it is a function.
   */
  raw <K extends TermKey> (key: K, ancestor?: boolean): TermValue<K> {
    let t$: Meta$<any> = this
    if (ancestor) {
      while (t$ && typeof t$.model[key] === "undefined") t$ = t$.parent$
    }
    return t$?.model[key]
  }

  /**
   * Find the value for the given key in this meta value's state or an ancestor.
   */
  stateValue <K extends StateKey>(key: K, ancestor?: boolean): StateValue<K> {
    let t$: Meta$<any> = this
    if (ancestor) {
      while (t$ && typeof t$.state[key] === "undefined") t$ = t$.parent$
    }
    return t$?.state[key]
  }

  /**
   * Return the nested meta value for the field with the given key.
   */
  $ <K extends FieldKey<T>>(key: K): Meta$<T[K], T> {
    const meta = this.meta
    if (isMeta(meta)) {
      const fieldMeta = <unknown>meta[key] as Meta<T[K], T>
      const fieldMeta$ = fieldMeta?.$ as Meta$<T[K]> ||
        // Fallback for accessing undefined child nodes, use default empty model
        metafy({}, this.value?.[key], this, key).$
      return fieldMeta$
    } else return null
  }

  /**
   * Return an array of all meta values for fields of this object.
   */
  fields$ (options: IncludeExclude<T> = {}) {
    return this.fieldKeys(options).map(this.$)
  }

  /**
   * Get an array of keys of all child fields.
   *
   * Unlike the modelKeys function, which takes a model and returns modelled keys,
   * fieldKeys returns keys for unmodelled fields which have been dynamically generated
   * as a result of a call to {@link $}.
   */
  fieldKeys (options: IncludeExclude<T> = {}): Array<FieldKey<T>> {
    if (Array.isArray(this.meta)) return []
    const allKeys = Array.from(new Set([...modelKeys(this.model), ...Object.keys(this.meta)]))
      .filter(k => k !== "$") as Array<FieldKey<T>>
    return includeExclude(allKeys, options)
  }
}

/**
 * The primary pattern for providing a processing function to MetaliQ.
 * The first parameter is the data value to be processed.
 * The second parameter is the data value's associated meta info object.
 *
 * Although named MetaFn for brevity in code,
 * will often be referred in text as a meta function or MetaFunction.
 */
export type MetaFn<Type, Parent = any, Result = any, E extends Event = Event> =
  (
    $?: Meta$<Type, Parent>,
    event?: E
  ) => Result

/**
 * A single meta function or a (potentially nested) array of meta functions.
 */
export type MetaFnTerm<T, P = any, R = any, E extends Event = Event> =
  MetaFn<T, P, R, E> | Array<MetaFnTerm<T, P, R, E>>

/**
 * A Configurable MetaFunction takes a set of configuration options
 * and returns a {@link MetaFn} configured with those options.
 */
export type ConfigurableMetaFn<Config, Type = any, Parent = any, Result = any> =
  (c: Config) => MetaFn<Type, Parent, Result>

/**
 * A value that is either a given type or a MetaFn for that type.
 */
export type MaybeFn<Type, Parent = any, Value = any> = Value | MetaFn<Type, Parent, Value>

/**
 * A valid key for an implemented and imported Policy term.
 */
export type TermKey = keyof Policy.Terms<any>

/**
 * The value type for a given Policy term key.
 */
export type TermValue<K extends TermKey> = Policy.Terms<any>[K]

/**
 * The value type for an optionally dynamic Policy term key.
 */
export type DerivedTermValue<K extends TermKey> = Exclude<TermValue<K>, MetaFn<any>>

/**
 * A valid key for a policy-defined meta-state value.
 */
export type StateKey = keyof Policy.State<any>

/**
 * The value type for a given Policy state key.
 */
export type StateValue<K extends StateKey> = Policy.State<any>[K]

/**
 * A key from a shared data provider
 */
export type SharedKey = keyof Policy.Shared

/**
 * A value from a shared data provider.
 */
export type SharedValue<K extends SharedKey> = Policy.Shared[K]

/**
 * Setups are registered by policies to perform any policy-based tasks and state initialisation.
 * Setups should check the policy's term(s) in the MetaModel to determine applicability of any such setup.
 */
export const metaSetups: Array<MetaFn<any, any, any>> = []

function setupMeta ($: Meta$<any>) {
  for (const metaSetup of metaSetups) {
    metaSetup($)
  }
}

const shared: Policy.Shared = {}
/**
 * Initialise a centralised lookup data provider shared by all nodes in the meta graph.
 */
export const initShared = (initSharedVals: Policy.Shared) => {
  Object.assign(shared, initSharedVals)
}

/**
 * Create a Meta object with the given MetaModel, data value and optional parent and key.
 * Optionally an existing Meta can be provided as prototype, in which case it will be reverted to the given value.
 */
export function metafy <T, P = any> (
  model: MetaModel<T, P>, value: T, parent$?: Meta$<P>, key?: FieldKey<P>, proto?: HasMeta$<T>, index?: number
): Meta<T, P> {
  const hasProto = !!proto
  const isArray = Array.isArray(value) || (model.items && !model.fields)
  const isArrayMember = typeof index === "number"
  const path = [parent$?.path, key, isArrayMember ? `[${index}]` : ""].filter(Boolean).join(".")

  // Establish the correct form of prototype for this meta
  proto = isArray
    ? Array.isArray(proto)
      ? proto
      : Object.assign([], { $: proto?.$ }) as HasMeta$<T>
    : proto || {} as Meta<T, P>

  // Reuse existing Meta$ if present, otherwise create new one
  const $ = proto?.$ || new Meta$<T, P>()

  // Add contextual meta information to Meta$
  Object.assign($, {
    model,
    parent$,
    key,
    path,
    state: proto?.$?.state || {},
    _value: value
  })

  if (isArrayMember) $.index = index

  const result: Meta<T, P> = <unknown>Object.assign(proto, { $ }) as Meta<T, P>

  // Assign the meta object to itself - useful for backlinks from values
  result.$.meta = result

  // Create backlink from value object to meta object to enable moving to and fro
  if (value && typeof value === "object") Object.assign(value, { $ })

  // Assign the meta into its parent if provided
  if (parent$ && key) {
    if (isArrayMember) {
      // (Re)attach this meta to its parent
      const parentMeta = parent$.meta as Meta<P>
      const parentMetaArray = parentMeta[key] as MetaArray<any>
      parentMetaArray[index] = result
      // (Re)attach the new value to the parent's value
      const parentArray = parent$.value[key] as any[]
      parentArray[index] = value
    } else {
      Object.assign(parent$.meta, { [key]: result }) // (Re)attach this meta to its parent
      Object.assign(parent$.value || {}, { [key]: value })
    }
  }

  // Descend through children creating further meta objects
  if (isArray) {
    const valueArr = <unknown>value as any[] || []
    const metaArr = <unknown>result as MetaArray<any, P>
    const oldMetas = metaArr.splice(0, metaArr.length)
    for (const [itemIndex, item] of valueArr.entries()) {
      const itemMeta = oldMetas.find(m => m.$ === $) || // Try finding old value by $
        oldMetas.find(m => m.$.value === item) // Find old value by value (less reliable as possibly not unique in array)
      metafy(model.items || {}, item, parent$, key, itemMeta, itemIndex)
    }
  } else {
    for (const fieldKey of result.$.fieldKeys()) {
      const fieldValue = value?.[fieldKey]
      const fieldModel = result.$.model.fields?.[fieldKey] || {}
      const fieldMeta = (result[fieldKey] ?? null) as Meta<any> // Re-attach to the existing meta
      metafy(fieldModel, fieldValue, result.$, fieldKey, fieldMeta)
    }
  }

  if (!hasProto) setupMeta(result.$) // Only do initial meta setup if no previous meta provided

  return result
}

/**
 * Resets the Meta$'s data value to any provided value else the original underlying data,
 * and restores the meta-graph from that point inwards.
 *
 * This can be called directly when a value should be reset and its meta-value is required immediately
 * during continuation of a synchronous process.
 *
 * This can also be called at a policy level to restore parts or the whole of the meta-graph,
 * such as in the review process established by the `@metaliq/application` policy.
 */
export function reset<T> (valueOr$: T | Meta$<T>, value?: T) {
  const $ = (meta$(valueOr$) || valueOr$) as Meta$<T>
  metafy($.model,
    typeof value === "undefined" ? $.value : value,
    $.parent$, $.key, $.meta, $.index)
}

/**
 * Instead of a full restoration of the meta-graph, reestablish backlinks throughout
 * a portion or a whole of an already restored meta-graph,
 * for example by `@metaliq/presentation` to ensure correct backlinks
 * in different parts of the overall view.
 */
export const relink = <T>($: Meta$<T>) => {
  if (typeof ($.value ?? false) === "object") {
    Object.assign($.value, { $ })
    if (isMeta<T>($.meta)) {
      for (const key of $.fieldKeys()) {
        relink($.meta[key].$ as Meta$<any>)
      }
    } else if (isMetaArray($.meta)) {
      for (const item of $.meta) {
        relink(item.$)
      }
    }
  }
}

/**
 * Obtain the meta value ($) object from either its associated data value object or itself.
 */
export const meta$ = <T>(v$: T | Meta$<T>): Meta$<T> => {
  if (typeof v$ !== "object") {
    throw new Error(`Cannot obtain Meta$ from primitive value: ${v$}`)
  }
  return isMeta$(v$) ? v$ : ((<unknown>v$ as HasMeta$<T>)?.$)
}

/**
 * A type guard to narrow a value or its meta value down to a meta value$.
 */
export const isMeta$ = <T, P = any>(v$: T | Meta$<T>): v$ is Meta$<T, P> =>
  v$ instanceof Meta$

/**
 * A type guard to narrow a MetaField to a Meta.
 */
export const isMeta = <T, P = any>(m: HasMeta$<T, P>): m is Meta<T, P> =>
  m && !Array.isArray(m)

/**
 * A type guard to narrow a MetaField to a MetaArray.
 */
export const isMetaArray = <
  T, P = any, I = T extends Array<infer I> ? I : never
>(m: HasMeta$<T, P> | MetaArray<I, P>): m is MetaArray<I, P> =>
  Array.isArray(m)

/**
 * Works better than keyof T where you know that T is not an array.
 */
export type FieldKey<T> = Exclude<Extract<keyof T, string>, "__typename">

/**
 * The type of a field of a given key in a given parent type.
 */
export type FieldType<Parent, Key extends FieldKey<Parent>> = Parent[Key]

/**
 * A type for including in options for functions that can include or exclude certain keys.
 */
export type IncludeExclude<T> = {
  include?: Array<FieldKey<T>>
  exclude?: Array<FieldKey<T>>
}

/**
 * Return the subset of the given keys that match the given IncludeExclude options.
 */
export const includeExclude = <T>(keys: Array<FieldKey<T>>, options?: IncludeExclude<T>) => {
  if (options?.include) return keys.filter(k => options.include.includes(k))
  else if (options?.exclude) return keys.filter(k => !options.exclude.includes(k))
  else return keys
}

/**
 * Return the field keys of a given MetaModel.
 *
 * Useful for situations where a Meta$ object is not (yet) available,
 * such as application `init`. Otherwise can use the `fieldKeys` method of
 * the Meta$ object, which also includes keys for "generated" fields
 * (i.e. those not included in the model but referenced in solution code).
 *
 * Takes an options object with keys to include / exclude from results.
 */
export const modelKeys = <T>(model: MetaModel<T>, options: IncludeExclude<T> = {}) => {
  const allKeys = Object.keys(model?.fields || {}) as Array<FieldKey<T>>
  return includeExclude(allKeys, options)
}

/**
 * Given either a meta value object or its underlying data value (but not a primitive),
 * return a reference to the value object for the parent.
 */
export const parent = <T extends object, P = any> (v$: Meta$<T, P> | T): P => {
  const $ = (meta$(v$) || v$) as Meta$<T, P>
  return $?.parent$?.value
}

/**
 * A simple type guard for terms that may or may not be a meta function.
 */
export const isMetaFn = (term: any): term is MetaFn<any> => typeof term === "function"

/**
 * Return the {@link Meta$} for the root node in the meta graph containing the
 * given node.
 *
 * Note that a root Meta$ won't have a parent type.
 */
export const root$: MetaFn<any, any, Meta$<any>> = $ => {
  let result = $
  while (result.parent$) {
    result = result.parent$
  }
  return result
}

/**
 * Return a MetaFn that will run a given MetaFn on all descendant nodes
 * of the provided node.
 */
export const onDescendants = (metaFn: MetaFn<any>, onBase: boolean = true): MetaFn<any> => $ => {
  const recurse = ($: Meta$<any>, onBase: boolean = true) => {
    if (!$) return
    if (onBase) metaFn($)
    const v = $.value
    if (v && typeof v === "object") {
      const children$ = isMetaArray($.meta) ? items$($) : fields$($)
      for (const child$ of children$) {
        recurse(child$)
      }
    }
  }

  recurse($, onBase)
}

/**
 * Return the result of the given function on the given child field.
 */
export function on <T, K extends FieldKey<T>> (key: K, metaFn: MetaFn<T[K]>): MetaFn<T> {
  return ($, event) => $.on(key, metaFn, event)
}

/**
 * Convert a plain function for a value of type T
 * (or a MetaliQ V1 style meta function)
 * into a MetaFn for data type T.
 */
export const $fn = <
  T, P = any, R = any, E extends Event = Event
>(fn: (v: T, $?: Meta$<T, P>, event?: E) => R): MetaFn<T, P, R, E> =>
  ($, event?) => fn($.value, $, event)

/**
 * Return a collection of Meta$ values for each field of the given parent Meta$ value.
 */
export const fields$: MetaFn<any> = $ =>
  $.fieldKeys().map(k => $.$(k))

/**
 * Return the Meta$ values for each item in a Meta$ of an array type.
 */
export const items$: MetaFn<any[]> = $ => {
  if (isMetaArray($.meta)) {
    return $.meta.map(m => m.$)
  }
}
