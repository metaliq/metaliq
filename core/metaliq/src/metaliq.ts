/**
 * The Policy namespace holds the interfaces for meta model definition.
 * These interfaces are extended within policy modules in order to build an overall policy
 * that encompasses their system capablities.
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
   * Policies can define Aspects - functions that will be available
   * on each of the Meta$ objects in the meta graph.
   *
   * The core package defines several default Aspects.
   */
  export interface Aspects<T, P = any> {
    /**
     * Self reference for easy inclusion of generic type parameters when merging.
     */
    this?: Aspects<T, P>

    /**
     * Call the specified meta function with this node's value and meta value.
     *
     * If provided with a raw value instead of a meta function,
     * returns the provided value, otherwise provides the result of the
     * function call.
     *
     * This value / meta function handling is useful for
     * querying potentially dynamic values of the options of a
     * configurable meta function, and mirrors the default handling
     * when fetching term values with {@link my}.
     */
    fn: <R>(valueOrMetaFn: R | MetaFn<T, P, R>) => R

    /**
     * Access a term of the associated MetaModel.
     *
     * By default, if the term is a MetaFn its result will be returned.
     * Specify `raw` to prevent this and return the MetaFn.
     * Specify `ancestor` to continue searching back through
     * the node's ancestry until a value is found for the given term.
     * Specify `rawAncestor` to get both behaviors.
     */
    my: <K extends TermKey>(key: K, ancestor?: boolean) => DerivedTermValue<K>

    /**
     * Access a raw term value without calling any MetaFn that is found there.
     * When used without the `ancestor` flag, this is equivalent to:
     * `$.model[key]`.
     *
     * Specify `ancestor` to continue searching back through
     * the node's ancestry until a value is found for the given term.
     */
    raw: <K extends TermKey> (key: K, ancestor?: boolean) => TermValue<K>

    /**
     * Navigate to the child Meta$ for the given key within this node of the meta graph.
     */
    child: <K extends FieldKey<T>>(key: K) => Meta$<T[K]>
  }
}

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
 * A meta object for an underlying value of a particular Type,
 * optionally within parent of type Parent.
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
 * Dollar property containing information and aspects for each node in the meta graph.
 */
export type Meta$<T, P = any> = Policy.Aspects<T, P> & {
  /**
   * Link to the node in the meta graph containing this $ property.
   * Useful for backlinks from object values.
   */
  meta?: HasMeta$<T, P>

  /**
   * Ancestor meta info within meta graph (if applicable).
   */
  parent?: Meta$<P>

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
   * The underlying data value getter / setter.
   */
  value?: T

  /**
   * The internal version of the data value.
   */
  _value?: T
}

/**
 * The type of the `fields` definition collection in a MetaModel.
 */
export type MetaModelFields<Type> = { [K in FieldKey<Type>]?: MetaModel<Type[K], Type> }

/**
 * MetaModel that extends a given data model Type and optional Parent.
 */
export type MetaModel<Type, Parent = any> = Policy.Terms<Type, Parent> & {
  fields?: Type extends any[]
    ? never
    : MetaModelFields<Type>
  items?: Type extends Array<infer I>
    ? MetaModel<I>
    : never
}

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
 * Use within a MetaSetup to establish a possibly dynamic state value based on a
 * MetaModel term that is either a literal or a meta function returning the literal.
 *
 * This implementation currently adds a getter that calls the function if it is dynamic.
 * TODO: Consider an option to auto-update the value on each review.
 *
 */
export const addDynamicState = <T, P = any, K extends TermKey = any>($: Meta$<T, P>, modelKey: K) => {
  const termValue = $.model[modelKey]
  if (isMetaFn(termValue)) {
    const modelValueFn = termValue as MetaFn<T, P, DerivedTermValue<K>>
    Object.defineProperty($.state, modelKey, {
      enumerable: true,
      get () {
        return modelValueFn($.value, $)
      }
    })
  } else {
    Object.assign($.state, { [modelKey]: termValue })
  }
}

/**
 * Create a Meta object with the given MetaModel, data value and optional parent and key.
 * Optionally an existing Meta can be provided as prototype, in which case it will be reverted to the given value.
 */
export function metafy <T, P = any> (
  model: MetaModel<T, P>, value: T, parent?: Meta$<P>, key?: FieldKey<P>, proto?: HasMeta$<T>, index?: number
): Meta<T, P> {
  const hasProto = !!proto
  const isArray = model.items || Array.isArray(value)

  // Establish the correct form of prototype for this meta
  proto = isArray
    ? Array.isArray(proto)
      ? proto
      : Object.assign([], { $: proto?.$ }) as HasMeta$<T>
    : proto || {} as Meta<T, P>

  // Reuse existing Meta$ if present, otherwise create new one
  const $ = proto?.$ || {
    // Value getter and setter defaults to keyed value within parent object if present,
    // so that primitive values are assigned properly to their place in the containing object.
    get value () {
      if (this.parent) {
        if (typeof this.index === "number") {
          return this.parent[this.key]?.value?.[this.index]?.$._value
        } else {
          return this.parent[this.key]?._value
        }
      } else {
        return this._value
      }
    },
    set value (val) {
      reset(this, val)
    }
  } as Meta$<T>

  // Add contextual meta information to Meta$
  Object.assign($, {
    model,
    parent,
    key,
    state: proto?.$?.state || {},
    _value: value
  })
  $.fn = ref => isMetaFn(ref)
    ? ref($.value, $)
    : ref
  $.my = <K extends TermKey>(key: K, ancestor?: boolean) => {
    const value = $.raw(key, ancestor)
    return $.fn(value) as DerivedTermValue<K>
  }
  $.raw = (key, ancestor?) => {
    let t$: Meta$<any> = $
    if (ancestor) {
      while (t$ && typeof t$.model[key] === "undefined") t$ = t$.parent
    }
    return t$.model[key]
  }
  $.child = <K extends FieldKey<T>>(key: K) => {
    const { meta } = $
    if (isMeta(meta)) {
      return <unknown>meta[key].$ as Meta$<T[K]>
    } else return null
  }

  if (typeof index === "number") $.index = index

  const result: Meta<T, P> = <unknown>Object.assign(proto, { $ }) as Meta<T, P>

  // Assign the meta object to itself - useful for backlinks from values
  result.$.meta = result

  // Create backlink from value object to meta object to enable moving to and fro
  if (value && typeof value === "object") Object.assign(value, { $ })

  // Assign the meta into its parent if provided
  if (parent && key && !Array.isArray(parent.value[key])) {
    Object.assign(parent.meta, { [key]: result }) // (Re)attach this meta to its parent
    Object.assign(parent.value || {}, { [key]: value }) // (Re)attach the new value to the parent's value
  }

  // Descend through children creating further meta objects
  if (isArray) {
    const valueArr = <unknown>value as any[] || []
    const metaArr = <unknown>result as MetaArray<any, P>
    metaArr.length = 0 // Remove any items from supplied prototype
    for (const [itemIndex, item] of valueArr.entries()) {
      const itemMeta = item?.$?.meta
      metaArr.push(metafy(model.items || {}, item, parent, key, itemMeta, itemIndex))
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
  const $ = (m$(valueOr$) || valueOr$) as Meta$<T>
  metafy($.model,
    typeof value === "undefined" ? $.value : value,
    $.parent, $.key, $.meta)
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
 * Shortcut from a value object to the $ meta info.
 */
export const m$ = <T>(value: T): Meta$<T> => {
  if (typeof value !== "object") {
    throw new Error(`Cannot obtain Meta$ from primitive value: ${value}`)
  }
  return (<unknown>value as HasMeta$<T>)?.$
}

/**
 * A type guard to narrow a MetaField to a Meta.
 */
export const isMeta = <T, P = any>(m: HasMeta$<T, P>): m is Meta<T, P> => !Array.isArray(m)

/**
 * Works better than keyof T where you know that T is not an array.
 */
export type FieldKey<T> = Exclude<Extract<keyof T, string>, "__typename">

/**
 * The type of a field of a given key in a given parent type.
 */
export type FieldType<Parent, Key extends FieldKey<Parent>> = Parent[Key]

/**
 * Return the field keys of a given MetaModel.
 */
export const fieldKeys = <T>(model: MetaModel<T>) =>
  Object.keys(model?.fields || {}) as Array<FieldKey<T>>

/**
 * The primary pattern for providing a processing function to MetaliQ.
 * The first parameter is the data value to be processed.
 * The second parameter is the data value's associated meta info object.
 */
export type MetaFn<Type, Parent = any, Result = any> =
  (
    value: Type,
    $?: Meta$<Type, Parent>,
    event?: Event
  ) =>
  Result

/**
 * An array of MetaFns of a particular type.
 */
export type MetaFns<Type, Parent = any, Result = any> = Array<MetaFn<Type, Parent, Result>>

/**
 * A Configurable MetaFunction takes a set of configuration options
 * and returns a MetaFunction configured with those options.
 */
export type ConfigurableMetaFn<Config, Type = any, Parent = any, Result = any> =
  (c: Config) => MetaFn<Type, Parent, Result>

/**
 * Sanitise the arguments to a MetaFn.
 * Use at the top of any MetaFn like:
 *
 * ```
 * const myMetaFn: MetaFn<any> = (v, $) => {
 *   [v, $] = $args(v, $)
 * }
 * ```
 *
 * (There is a convenience method called `$fn` that applies this transform to any MetaFn.)
 *
 * Normally a MetaFn is called with a data value and its associated meta-information,
 * like `myMetaFn(value, $)`.
 *
 * However, if a MetaFn uses $args as shown above, it guards against cases
 * where it has been called with its data value only,
 * (in which case its meta information will be extracted and assigned to local $,
 * does not work for primitive data types)
 * or by passing the meta-information as the only parameter
 * (in which case its value will be extracted and v and $ set accordingly).
 */
export const $args = <Type, Parent> (value: Type, $?: Meta$<Type, Parent>, event?: Event): [ Type, Meta$<Type, Parent> ] => {
  const maybeValue = value as any
  if (!$ && typeof maybeValue === "object") {
    if (maybeValue.$) {
      $ = maybeValue.$
    } else if (["value", "model", "meta"].every(key => !!maybeValue[key])) {
      $ = maybeValue
      value = $.value
    }
  }
  return [value, $]
}

/**
 * Convenient method of wrapping a MetaFn and adding the behaviour of $args.
 */
export const $fn = <Type, Parent, Return> (fn: MetaFn<Type, Parent, Return>): MetaFn<Type, Parent, Return> => (v, $, e) => {
  [v, $] = $args(v, $)
  return fn(v, $, e)
}

/**
 * A simple type guard for terms that may or may not be a meta function.
 */
export const isMetaFn = (term: any): term is MetaFn<any> => typeof term === "function"

/**
 * Combine any number of meta functions into a single meta function
 * which filters out any null entries provided and
 * returns an array of the individual results.
 *
 * Useful for combining functionality into a single MetaFn term.
 */
export const fns = <T, P = any, R = any> (
  ...metaFns: Array<MetaFn<T, P, R>>
): MetaFn<T, P, R[]> => (v, $) => metaFns
    .filter(f => typeof f === "function")
    .map(f => f(v, $))

/**
 * Return the {@link Meta$} for the root node in the meta graph containing the
 * node with the given Meta$.
 *
 * In the case where you know what Meta$ type to expect,
 * you can specify with `root$<MyType>(myNode$)`.
 *
 * Note that a root Meta$ won't have a parent type.
 */
export const root$ = <T> (v: any, $?: Meta$<any>) => {
  [v, $] = $args(v, $)
  let result = $
  while (result.parent) {
    result = result.parent
  }
  return result as Meta$<T>
}

/**
 * Return a MetaFn that will run a given MetaFn on all descendant nodes
 * of the provided node.
 */
export const onDescendants = (fn: MetaFn<any>, onBase: boolean = true): MetaFn<any> => $fn((v, $) => {
  const recurse = ($: Meta$<any>, onBase: boolean = true) => {
    if (onBase) fn(v, $)
    const keys = fieldKeys($.model)
    for (const key of keys) {
      recurse(($.child(key)))
    }
  }

  recurse($, onBase)
})
