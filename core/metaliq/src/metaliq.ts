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
    reset(this, val)
  }

  /**
   * Run the given MetaFn for this node in the meta graph.
   * If a non-function value is provided, then that value is returned.
   */
  fn <R>(ref: R | MetaFn<T, P, R>): R {
    return isMetaFn(ref) ? ref(this.value, this) : ref
  }

  /**
   * Find the value for the given term. If the term is a meta function
   * its result will be returned - allows for easy configuration of dynamic terms.
   *
   * However, if you need to actually access a meta function term itself, you will
   * need to use the method `raw` instead.
   */
  term <K extends TermKey>(key: K, ancestor?: boolean): DerivedTermValue<K> {
    const value = this.raw(key, ancestor)
    return this.fn(value) as DerivedTermValue<K>
  }

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
   * Return the child meta value for the given key.
   */
  child$ <K extends FieldKey<T>>(key: K): Meta$<T[K]> {
    const meta = this.meta
    if (isMeta(meta)) {
      const childMeta = <unknown>meta[key] as Meta<T[K], T>
      return childMeta?.$ as Meta$<T[K]>
    } else return null
  }

  /**
   * Get an array of keys of all child fields.
   */
  childKeys (): Array<FieldKey<T>> {
    return Object.keys(this.model?.fields || {}) as Array<FieldKey<T>>
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
export type MetaFn<Type, Parent = any, Result = any> =
  (
    value: Type,
    $?: Meta$<Type, Parent>,
    event?: Event
  ) => Result

/**
 * An array of MetaFns of a particular type.
 */
export type MetaFns<Type, Parent = any, Result = any> = Array<MetaFn<Type, Parent, Result>>

/**
 * A Configurable MetaFunction takes a set of configuration options
 * and returns a {@link MetaFn} configured with those options.
 */
export type ConfigurableMetaFn<Config, Type = any, Parent = any, Result = any> =
  (c: Config) => MetaFn<Type, Parent, Result>

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
 * Setups are registered by policies to perform any policy-based tasks and state initialisation.
 * Setups should check the policy's term(s) in the MetaModel to determine applicability of any such setup.
 */
export type MetaSetup<T, P = any> = ($: Meta$<T, P>) => void

export const metaSetups: Array<MetaSetup<any>> = []

function setupMeta ($: Meta$<any>) {
  for (const metaSetup of metaSetups) {
    metaSetup($)
  }
}

/**
 * Create a Meta object with the given MetaModel, data value and optional parent and key.
 * Optionally an existing Meta can be provided as prototype, in which case it will be reverted to the given value.
 */
export function metafy <T, P = any> (
  model: MetaModel<T, P>, value: T, parent$?: Meta$<P>, key?: FieldKey<P>, proto?: HasMeta$<T>, index?: number
): Meta<T, P> {
  const hasProto = !!proto
  const isArray = model.items || Array.isArray(value)
  const isArrayMember = typeof index === "number"

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
    state: proto?.$?.state || {},
    _value: value
  })

  if (typeof index === "number") $.index = index

  const result: Meta<T, P> = <unknown>Object.assign(proto, { $ }) as Meta<T, P>

  // Assign the meta object to itself - useful for backlinks from values
  result.$.meta = result

  // Create backlink from value object to meta object to enable moving to and fro
  if (value && typeof value === "object") Object.assign(value, { $ })

  // Assign the meta into its parent if provided
  if (parent$ && key && !isArrayMember) {
    Object.assign(parent$.meta, { [key]: result }) // (Re)attach this meta to its parent
    Object.assign(parent$.value || {}, { [key]: value }) // (Re)attach the new value to the parent's value
  }

  // Descend through children creating further meta objects
  if (isArray) {
    const valueArr = <unknown>value as any[] || []
    const metaArr = <unknown>result as MetaArray<any, P>
    metaArr.length = 0 // Remove any items from supplied prototype
    for (const [itemIndex, item] of valueArr.entries()) {
      const itemMeta = item?.$?.meta
      metaArr.push(metafy(model.items || {}, item, parent$, key, itemMeta, itemIndex))
    }
  } else {
    for (const fieldKey of fieldKeys(model)) {
      const fieldValue = value?.[fieldKey]
      const fieldModel = result.$.model.fields[fieldKey]
      const fieldMeta = (result[fieldKey] ?? null) as Meta<any> // Re-attach to the existing meta
      if (fieldModel) metafy(fieldModel, fieldValue, result.$, fieldKey, fieldMeta)
    }
  }

  if (!hasProto) setupMeta(result.$) // Only do initial meta setup if no previous meta provided

  return result
}

/**
 * Resets the Meta$'s data value, to any provided value else the original underlying data.
 * Example uses include:
 * (a) replacing a complete object value directly rather than via its parent, and
 * (b) to restore current backlinks to a value object that is referenced more than once in the meta-graph.
 */
export function reset<T> (valueOr$: T | Meta$<T>, value?: T) {
  const $ = (meta$(valueOr$) || valueOr$) as Meta$<T>
  metafy($.model,
    typeof value === "undefined" ? $.value : value,
    $.parent$, $.key, $.meta, $.index)
}

/**
 * Apply a given MetaModel to an existing Meta$ object.
 */
export function applyModel<T> ($: Meta$<T>, model: MetaModel<T>) {
  $.model = model
  setupMeta($)
  if (isMeta($.meta)) {
    for (const key of fieldKeys(model)) {
      const fieldModel = <unknown>model.fields[key] as MetaModel<T[FieldKey<T>]>
      const fieldMeta = <unknown>$.meta[key] as Meta<T[FieldKey<T>]>
      applyModel(fieldMeta.$, fieldModel)
    }
  }
}

/**
 * Obtain the meta value ($) object from either its associated data value object or itself.
 */
export const meta$ = <T>(value: T): Meta$<T> => {
  if (typeof value !== "object") {
    throw new Error(`Cannot obtain Meta$ from primitive value: ${value}`)
  }
  return (<unknown>value as HasMeta$<T>)?.$
}

/**
 * A type guard to narrow a MetaField to a Meta.
 */
export const isMeta = <T, P = any>(m: HasMeta$<T, P>): m is Meta<T, P> => m && !Array.isArray(m)

/**
 * A type guard to narrow a MetaField to a MetaArray.
 */
export const isMetaArray = <T, P = any>(m: HasMeta$<T[], P>): m is MetaArray<T, P> => Array.isArray(m)

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
 * Return the field keys of a given MetaModel.
 *
 * Takes an options object with keys to include / exclude from results.
 */
export const fieldKeys = <T>(model: MetaModel<T>, options: IncludeExclude<T> = {}) => {
  const allKeys = Object.keys(model?.fields || {}) as Array<FieldKey<T>>
  if (options?.include) return allKeys.filter(k => options.include.includes(k))
  else if (options?.exclude) return allKeys.filter(k => !options.exclude.includes(k))
  else return allKeys
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
 * In the case where you know what Meta$ type to expect,
 * you can specify with `root$<MyType>(myNode$)`.
 *
 * Note that a root Meta$ won't have a parent type.
 */
export const root$ = (v: any, $?: Meta$<any>) => {
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
export const onDescendants = (fn: MetaFn<any>, onBase: boolean = true): MetaFn<any> => (v, $) => {
  const recurse = ($: Meta$<any>, onBase: boolean = true) => {
    if (onBase) fn(v, $)
    const keys = fieldKeys($.model)
    for (const key of keys) {
      recurse(($.child$(key)))
    }
  }

  recurse($, onBase)
}
