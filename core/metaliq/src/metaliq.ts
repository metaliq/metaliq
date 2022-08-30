/**
 * The Policy namespace holds the interfaces for system Specifications and extended State.
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
  export interface Specification<T, P = any> {
    /**
     * Self reference for easy inclusion of generic type parameters when merging.
     */
    this?: Specification<T, P>

    /**
     * Register of policy string literals.
     */
    policies?: string[]
  }

  export interface State<T, P = any> {
    /**
     * Self reference for easy inclusion of generic type parameters when merging.
     */
    this?: State<T, P>
  }
}

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
 * Dollar property containing meta information.
 */
export type Meta$<T, P = any> = {
  /**
   * Link to the meta object containing this $ property.
   * Useful for backlinks from object values.
   */
  meta?: HasMeta$<T, P>

  /**
   * Ancestry within meta graph (if applicable).
   */
  parent?: HasMeta$<P>

  /**
   * Key within parent meta (if applicable).
   */
  key?: FieldKey<P>

  /**
   * The specification applied to this meta object.
   */
  spec: MetaSpec<T, P>

  /**
   * The runtime Meta state.
   */
  state: Policy.State<T, P>

  /**
   * The underlying data value getter / setter.
   */
  value?: T

  /**
   * The internal (potentially transient) version of the data value.
   */
  _value?: T

}

/**
 * Specification for a given Type and optional Parent.
 */
export type MetaSpec<T, P = any> = Policy.Specification<T, P> & {
  fields?: T extends any[]
    ? never
    : { [K in FieldKey<T>]?: MetaSpec<T[K], T> }
  items?: T extends Array<infer I>
    ? MetaSpec<I>
    : never
}

/**
 * Setups are registered by policies to perform any policy-based tasks and state initialisation.
 * Setups should check the policy's term(s) in the meta spec to determine applicability of any such setup.
 */
export type MetaSetup<T, P = any> = (meta: Meta$<T, P>) => any

export const metaSetups: Array<MetaSetup<any>> = []

function setupMeta ($: Meta$<any>) {
  for (const metaSetup of metaSetups) {
    metaSetup($)
  }
}

/**
 * Use within a metaSetup to establish a possibly dynamic state value based on a
 * specification term that is either a literal or a meta function returning the literal.
 */
export const addDynamicState = <T, P = any, K extends SpecKey = any>($: Meta$<T, P>, specKey: K) => {
  const specValue = $.spec[specKey]
  if (isMetaFn(specValue)) {
    const specValueFn = specValue as MetaFn<T, P, DerivedSpecValue<K>>
    Object.defineProperty($.state, specKey, {
      enumerable: true,
      get () {
        return specValueFn($.value, $)
      }
    })
  } else {
    Object.assign($.state, { [specKey]: specValue })
  }
}

/**
 * Return a path string for the given meta,
 * with the given root meta name which defaults to "meta".
 */
function metaPath ($: HasMeta$<any>, root = "meta"): string {
  let path = $.$.key ?? root
  let parent = $.$.parent
  while (parent) {
    path = `${parent.$.key ?? root}.${path}`
    parent = parent.$.parent
  }
  return `${path}`
}

function metaToString (meta: Meta<any>): string {
  const value = meta.$.value
  if (typeof value === "undefined") {
    return ""
  } else if (Array.isArray(value)) {
    return "" // Should be in MetaArrayProto instead
  } else if (typeof value === "object") {
    return metaPath(meta)
  } else if (typeof value === "boolean") {
    return value ? "true" : "false"
  } else {
    return value?.toString() || ""
  }
}

const MetaProto = {
  toString () {
    return metaToString(this)
  }
}

class MetaArrayProto extends Array {
  toString () {
    return metaPath(<unknown> this as MetaArray<any>)
  }
}

/**
 * Create a Meta object with the given spec, value and optional parent and key.
 * Optionally an existing Meta can be provided as prototype, in which case it will be reverted to the given value.
 */
export function metafy <T, P = any> (
  spec: MetaSpec<T, P>, value: T, parent?: Meta<P>, key?: FieldKey<P>, proto?: HasMeta$<T>
): Meta<T, P> {
  const hasProto = !!proto
  const isArray = spec.items || Array.isArray(value)

  // Establish the correct form of prototype for this meta
  proto = isArray
    ? proto instanceof MetaArrayProto
      ? proto
      : new MetaArrayProto()
    : proto || Object.create(MetaProto)

  // Reuse existing Meta$ if present, otherwise create new one
  const $ = proto?.$ || {
    get value () {
      if (typeof this._value === "object" || !this.parent) {
        return this._value
      } else {
        return this.parent[this.key]?.$._value
      }
    },
    set value (val) {
      reset(this, val)
    }
  }

  // Add contextual meta information to Meta$
  Object.assign($, {
    spec,
    parent,
    key,
    state: proto?.$?.state || {},
    _value: value
  })
  const result: Meta<T, P> = <unknown>Object.assign(proto, { $ }) as Meta<T, P>

  // Assign the meta object to itself - useful for backlinks from values
  result.$.meta = result

  // Create backlink from value object to meta object to enable moving to and fro
  if (value && typeof value === "object") Object.assign(value, { $ })

  // Assign the meta into its parent if provided
  if (parent && key && !(parent[key] instanceof MetaArrayProto)) {
    Object.assign(parent, { [key]: result }) // (Re)attach this meta to its parent
    Object.assign(parent.$.value || {}, { [key]: value }) // (Re)attach the new value to the parent's value
  }

  // Descend through children creating further meta objects
  if (isArray) {
    const valueArr = <unknown>value as any[] || []
    const metaArr = <unknown>result as MetaArray<any, P>
    metaArr.length = 0 // Remove any items from supplied prototype
    for (const item of valueArr) {
      const itemMeta = item?.$?.meta
      metaArr.push(metafy(spec.items || {}, item, parent, key, itemMeta))
    }
  } else {
    for (const fieldKey of fieldKeys(spec)) {
      const fieldValue = value?.[fieldKey]
      const fieldSpec = result.$.spec.fields[fieldKey]
      const fieldMeta = (result[fieldKey] ?? null) as Meta<any> // Re-attach to the existing meta
      if (fieldSpec) metafy(fieldSpec, fieldValue, result, fieldKey, fieldMeta)
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
  metafy($.spec,
    typeof value === "undefined" ? $.value : value,
    $.parent as Meta<any>, $.key, $.meta)
}

/**
 * Apply a given spec to an existing meta.
 */
export function applySpec<T> ($: Meta$<T>, spec: MetaSpec<T>) {
  $.spec = spec
  setupMeta($)
  if (isMeta($.meta)) {
    for (const key of fieldKeys(spec)) {
      const fieldSpec = <unknown>spec.fields[key] as MetaSpec<T[FieldKey<T>]>
      const fieldMeta = <unknown>$.meta[key] as Meta<T[FieldKey<T>]>
      applySpec(fieldMeta.$, fieldSpec)
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
 * Shortcut from a parent (either its value or its Meta$) to the $ meta info of one of its child keys.
 */
export const child$ = <
  P, K extends FieldKey<P>, T extends FieldType<P, K>
> (parent: P | Meta$<P>, key: K) => {
  const parent$ = (m$(parent) || parent) as Meta$<P>
  const valueMeta = parent$.meta as Meta<any>
  const keyMeta = valueMeta[key]
  const key$ = <unknown>keyMeta?.$ as Meta$<T, P>
  return key$
}

/**
 * A type guard to narrow a MetaField to a Meta.
 */
export const isMeta = <T, P = any>(m: HasMeta$<T, P>): m is Meta<T, P> => !Array.isArray(m)

/**
 * A type guard to narrow a MetaField to a MetaArray.
 */
export const isMetaArray = <T, P = any>(m: HasMeta$<T[], P>): m is MetaArray<T, P> => Array.isArray(m)

/**
 * Shortcut to a proxy object for the parent.
 */
export const parent = <T extends object, P = any> (value: T | HasMeta$<T, P>) => m$(value)?.parent?.$.value

/**
 * Works better than keyof T where you know that T is not an array.
 */
export type FieldKey<T> = Exclude<Extract<keyof T, string>, "__typename">

/**
 * The type of a field of a given key in a given parent type.
 */
export type FieldType<Parent, Key extends FieldKey<Parent>> = Parent[Key]

/**
 * Return the keys of a field spec.
 */
export const fieldKeys = <T>(spec: MetaSpec<T>) =>
  Object.keys(spec?.fields || {}) as Array<FieldKey<T>>

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

export type SpecKey = keyof Policy.Specification<any>
export type SpecValue<K extends SpecKey> = Policy.Specification<any>[K]
export type DerivedSpecValue<K extends SpecKey> = Exclude<SpecValue<K>, MetaFn<any>>

/**
 * A simple type guard for terms that may or may not be a meta function.
 */
export const isMetaFn = (term: any): term is MetaFn<any> => typeof term === "function"

/**
 * Return the value of a spec term that is defined as being
 * either a particular type or a MetaFn that returns that type.
 */
export const getDynamicTerm = <K extends SpecKey>(key: K): MetaFn<any, any, DerivedSpecValue<K>> =>
  (v, $ = m$(v)) => {
    const specValue = $.spec[key]
    if (isMetaFn(specValue)) return specValue(v, $)
    else return specValue
  }

export const getAncestorTerm = <K extends SpecKey>(
  key: K, dynamic: boolean = false
): MetaFn<any, any, SpecValue<K>> =>
    (v, $ = m$(v)) => {
      while ($ && typeof $.spec[key] === "undefined") $ = $.parent?.$
      const termValue = $.spec[key]
      return termValue
    }
