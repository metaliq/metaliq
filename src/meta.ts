import { Policy } from "./policy"
import { MaybeReturn } from "./util/util"

/**
 * A meta object for an underlying value of type T,
 * optionally within parent of type P.
 * T can be any type other than an array, for which MetaArrays are used.
 */
export type Meta<T, P = any> = MetaFields<T> & HasMeta$<T, P>

/**
 * The mapped fields component of a Meta object.
 */
export type MetaFields<T> = {
  [K in FieldKey<T>]: MetaField<T, K>
}

/**
 * An individual field within a Meta.
 * Can be another Meta, or a MetaArray.
 */
export type MetaField<T, K extends FieldKey<T>> = T[K] extends Array<infer I>
  ? MetaArray<I, T>
  : Meta<T[K], T>

/**
 * The meta object for an array field,
 * along with a collection of Meta objects associated with its content.
 */
export type MetaArray<T, P = any> = Array<Meta<T, P>> & HasMeta$<T[], P>

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
  parent?: Meta<P>

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
export type MetaSetup<T, P = any> = (meta: Meta$<T, P>) => MaybeReturn<Policy.State<T, P>>

export const metaSetups: Array<MetaSetup<any>> = []

function setupMeta ($: Meta$<any>) {
  for (const maker of metaSetups) {
    const state = maker($) || {}
    Object.assign($.state, state)
  }
}

/**
 * Use within a metaSetup to establish a possibly dynamic state value based on a
 * specification term that is either a literal or a meta function returning the literal.
 */
export const addDynamicState = <T>($: Meta$<T>, name: SpecKey) => {
  const specValue = $.spec[name]
  if (isMetaFn(specValue)) {
    Object.defineProperty($.state, name, {
      enumerable: true,
      get () {
        return specValue($.value, $)
      }
    })
  } else {
    Object.assign($.state, { [name]: specValue })
  }
}

/**
 * Return a path string for the given meta,
 * with the given root meta name which defaults to "meta".
 */
function metaPath (meta: HasMeta$<any>, root = "meta"): string {
  let path = meta.$.key ?? root
  let parent = meta.$.parent
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
      reset(this.meta, val)
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
export function reset<T> ($: Meta$<T>, value?: T) {
  metafy($.spec,
    typeof value === "undefined" ? $.value : value,
    $.parent, $.key, $.meta)
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
 * Shortcut from a Meta$ to the $ meta info of one of its child keys.
 */
export const m$Key = <T, K extends FieldKey<T>>($: Meta$<T>, key: K) => {
  const valueMeta = $.meta as Meta<any>
  const keyMeta = valueMeta[key]
  const key$ = <unknown>keyMeta?.$ as Meta$<T[K]>
  return key$
}

/**
 * Typed shortcut from a value or Meta$ object to its associated meta object,
 * or optionally the meta object of one of its properties.
 */
export const meta = <T, P = any> (value: T | Meta$<T, P>, key?: FieldKey<T>) => {
  if (!(value ?? false) || typeof value !== "object") {
    throw new Error(`Cannot obtain meta from primitive value: ${value}`)
  }
  const $ = (m$(value) || value) as Meta$<T, P>
  const valueMeta = $?.meta as Meta<T, P>
  return key ? valueMeta[key] : valueMeta
}

/**
 * A type guard to narrow a meta field to a Meta.
 */
export const isMeta = <T, P = any>(m: HasMeta$<T, P>): m is Meta<T, P> => !Array.isArray(m)

/**
 * A type guard to narrow a meta field to a MetaArray.
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
 * Return the keys of a field spec.
 */
export const fieldKeys = <T>(spec: MetaSpec<T>) =>
  Object.keys(spec?.fields || {}) as Array<FieldKey<T>>

/**
 * The primary pattern for defining a data function in MetaliQ.
 * A MetaFn receives two parameters - the underlying data value and the meta.
 * The first parameter is the data value itself, and often you can specify a function
 * which works on a single parameter of the underlying data type.
 * The second parameter is the associated object from the meta-graph.
 */
export type MetaFn<T, P = any, R = any> = (value: T, $?: Meta$<T, P>) => R

/**
 * Shortcut to call a metaFn with both parameters
 * by passing just the Meta or the MetaValue of an object type.
 * This is primarily for use at the policy level.
 */
export const metaCall = <T, P = any, R = any> (
  fn: MetaFn<T, P, R>
) => (on: T): R => {
    if (typeof (on ?? false) !== "object") {
      throw new Error(`Cannot perform metaCall on primitive value: ${on}`)
    }
    const $ = m$(on)
    return fn($.value, $)
  }

/**
 * A simple type guard for values that may or may not be a meta function,
 * such as when a spec term can be static or derived.
 */
export const isMetaFn = (value: any): value is MetaFn<any> => typeof value === "function"

export type SpecKey = keyof Policy.Specification<any>
export type SpecValue<K extends SpecKey> = Policy.Specification<any>[K]
export type DerivedSpecValue<K extends SpecKey> = Exclude<SpecValue<K>, MetaFn<any>>

/**
 * Return the value of a spec term that is defined as being
 * either a particular type or a MetaFn that returns that type.
 */
export const getSpecValue = <K extends SpecKey, V extends DerivedSpecValue<K>>(key: K): MetaFn<any> =>
  (v, $ = m$(v)): V => {
    const specValue = $.spec[key]
    if (isMetaFn(specValue)) return metaCall(specValue)(meta)
    else return specValue as V
  }

export const getAncestorSpecValue = <K extends SpecKey, V extends SpecValue<K>>($: Meta$<any>, key: K): V => {
  while ($ && typeof $.spec[key] === "undefined") $ = $.parent?.$
  return $?.spec[key]
}
