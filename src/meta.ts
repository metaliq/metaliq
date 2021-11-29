import { Policy } from "./policy"
import { MaybeReturn } from "./util/util"

/**
 * Meta-structure of Type in optional Parent.
 */
export type Meta<T, P = any> = MetaFields<T> & Meta$<T, P>

/**
 * Mapped fields part of the meta-structure of an object type.
 */
export type MetaFields<T> = {
  [K in FieldKey<T>]: MetaField<T, K>
}

export type MetaField<T, K extends FieldKey<T>> = T[K] extends Array<infer I>
  ? MetaArray<I, T>
  : Meta<T[K], T>

export type MetaArray<T, P = any> = Array<Meta<T, P>> & Meta$<T[], P>

/**
 * Dollar property containing additional info.
 * This is the full meta-structure for non-object types.
 */
export type Meta$<T, P = any> = {
  $: {
    // Link to the containing meta object - useful for backlinks from values
    meta?: Meta<T>
    // Ancestry within object graph (if applicable)
    parent?: Meta<P>
    key?: FieldKey<P>

    // Specification and State
    spec: MetaSpec<T, P>
    state: Policy.State<T, P>

    // Underlying value getter and setter
    value?: T
  }
}

/**
 * Specification for a given Type and optional Parent.
 */
export type MetaSpec<T, P = any> = Policy.Specification<T, P> & {
  fields?: {
    [K in FieldKey<T>]?: MetaSpec<T[K], T>
  }
  items?: T extends Array<infer I>
    ? I extends unknown ? MetaSpec<any> : MetaSpec<I>
    : never
}

/**
 * Setups are registered by policies to perform any policy-based tasks and state initialisation.
 * Setups should check the policy's term(s) in the meta spec to determine applicability of any such setup.
 */
export type MetaSetup<T, P = any> = (meta: Meta<T, P>) => MaybeReturn<Policy.State<T, P>>

export const metaSetups: Array<MetaSetup<any>> = []

function setupMeta (meta: Meta<any>) {
  for (const maker of metaSetups) {
    const state = maker(meta) || {}
    meta.$.state = Object.assign({}, state, meta.$.state) // Preserve any predefined state, for example from serialisation
  }
}

/**
 * Return a path string for the given meta,
 * with the given root meta name which defaults to "Meta".
 */
function metaPath (meta: Meta$<any>, root = "Meta"): string {
  const value = meta.$.value
  if (["object", "undefined"].includes(typeof value)) {
    let path = meta.$.key ?? root
    let parent = meta.$.parent
    while (parent) {
      path = `${parent.$.key ?? root}.${path}`
      parent = parent.$.parent
    }
    return `${path}`
  } else if (typeof value === "boolean") {
    return value ? "true" : "" // Allow coercion of falsy values
  } else {
    return value?.toString() || root
  }
}

const MetaProto = {
  toString () {
    return metaPath(this)
  }
}

class MetaArrayProto extends Array {
  toString () {
    return metaPath(<unknown> this as Meta$<any>)
  }
}

/**
 * Create a Meta object with the given spec, value and optional parent and key.
 */
export function metafy <T, P = any> (
  spec: MetaSpec<T, P>, value: T, parent?: Meta<P>, key?: FieldKey<P>
): Meta<T, P> {
  // Create extended meta information object with value embedded in $.value
  const m$ = meta$(spec, value, parent, key)
  const proto = Object.create(MetaProto)
  const meta: Meta<T, P> = <unknown>Object.assign(proto, m$) as Meta<T, P>
  // Assign the meta object to itself - useful for backlinks from values
  meta.$.meta = meta

  // Descend through spec keys creating further meta objects
  const fields = fieldKeys(spec)
  for (const fieldKey of fields) {
    const fieldValue = value?.[fieldKey]
    metaset(meta, fieldKey, fieldValue)
  }

  setupMeta(meta)

  // Create backlink from value object to meta object to enable moving to and fro
  if (value && typeof value === "object") {
    Object.assign(value, m$)
  }

  return meta
}

/**
 * Create a Meta$ for the given spec, value and optional parent and key.
 */
export function meta$ <T, P> (
  spec: MetaSpec<T, P>, value: T, parent?: Meta<P>, key?: FieldKey<P>
): Meta$<T, P> {
  return {
    $: {
      parent,
      key,
      spec,
      state: (m(value)?.$?.state || parent?.[key]?.$?.state || {}) as Policy.State<T, P>,
      value
    }
  }
}

/**
 * Metafy the given raw value and assign to the given parent Meta at the given key.
 */
export function metaset <P, K extends FieldKey<P>> (
  parent: Meta<P>, key: K, value: P[K]
) {
  const fieldSpec = parent.$.spec.fields[key] as MetaSpec<P[K], P>
  if (Array.isArray(value) && fieldSpec.items) {
    const arr$ = meta$(fieldSpec, value, parent, key)
    const arr = value.map(val => metafy(fieldSpec.items, val, parent, key))
    const metaArr = Object.assign(new MetaArrayProto(), arr, arr$)
    Object.assign(parent, { [key]: metaArr })
  } else {
    Object.assign(parent, { [key]: metafy(fieldSpec, value, parent, key) })
  }
}

/**
 * Process to commit the current state of the embedded / nested value object to the given meta.
 * Any values that were originally null stay null if all recursively nested sub-values are null,
 * but if any of the nested sub-values have been populated then the higher level value
 * is initialised to an object with the sub-values assigned to it.
 */
export function commitMeta<T> (meta: Meta<T>) {
  const keys = fieldKeys(meta.$.spec)
  for (const key of keys) {
    const sub = meta[key]
    if (Array.isArray(sub)) {
      const subArr = sub as MetaArray<any>
      console.warn(`Meta array of length ${subArr.length} not committed`) // TODO: Commit meta arrays back to underlying value
    } else {
      const subMeta = sub as Meta<any>
      commitMeta(subMeta)
      if (v(meta) === null && v(subMeta) !== null) {
        meta.$.value = <T>{} // Initialise previously null meta value when descendant values present
      }
      if (v(meta) !== null && typeof v(subMeta) !== "object") {
        meta.$.value[key] = v(subMeta) as T[FieldKey<T>]
      }
    }
  }
}

/**
 * Applies the given data value recursively to the meta-object's primitive field sub-values.
 * This function is useful for applying an externally sourced value to a meta object
 * prior to then committing that value.
 * Calling this function followed by a commit would set both the transient and embedded state of the meta.
 */
export function applyToMeta<T> (meta: Meta<T>, value: T) {
  if (!meta.$.spec) return
  if (meta.$.spec.fields) { // Object value - recurse
    if (!value) return
    const keys = fieldKeys(meta.$.spec)
    for (const key of keys) {
      const sub = meta[key]
      if (Array.isArray(value[key])) {
        const subArr = sub as MetaArray<any>
        console.warn(`Array of length ${subArr.length} not applied to meta`) // TODO: Commit meta arrays back to underlying value
      } else {
        const subMeta = sub as Meta<any>
        applyToMeta(subMeta, value[key])
      }
    }
  } else {
    meta.$.value = value
  }
}

/**
 * Apply a given spec to an existing meta.
 */
export function applySpec<T> (meta: Meta<T>, spec: MetaSpec<T>) {
  meta.$.spec = spec
  setupMeta(meta)
  for (const key of fieldKeys(spec)) {
    const fieldSpec = <unknown>spec.fields[key] as MetaSpec<T[FieldKey<T>]>
    const fieldMeta = <unknown>meta[key] as Meta<T[FieldKey<T>]>
    applySpec(fieldMeta, fieldSpec)
  }
}

/**
 * Shortcut to get the embedded value from the meta object.
 */
export const v = <T>(meta: Meta<T>): T => meta.$.value

/**
 * Shortcut from a value object to the containing meta object.
 */
export const m = <T>(value: T): Meta<T> => (<unknown>value as Meta$<T>)?.$?.meta

/**
 * Works better than keyof T where you know that T is not an array.
 */
export type FieldKey<T> = Extract<keyof T, string>

/**
 * Return the keys of a field spec.
 */
export const fieldKeys = <T>(spec: MetaSpec<T>) =>
  Object.keys(spec?.fields || {}) as Array<FieldKey<T>>

/**
 * A processing function that takes a reference to a data structure
 * and an optional message and potentially returns a result.
 * By convention, the provided data value may be mutated, but no other side effect should be produced.
 * So this is neither a "pure" function or a completely "impure" one - it is a data transformation process.
 */
export type Process<T, M = any, R = any> = (data: T, message?: M) => R

/**
 * A process function for a meta type.
 */
export type MetaProc<T, P = any, M = any, R = any> = (meta: Meta<T, P>, message?: M) => R

/**
 * Return a meta process function for the given underlying process.
 */
export const metaProc = <T, M = any, R = any> (proc: Process<T, M, R>): MetaProc<T, any, M, R> => (meta, message) => {
  const result = proc(v(meta), message)
  applyToMeta(meta, v(meta))
  return result
}

/**
 * Convenience types and function for converting from a map of procs to the equivalent map of metaprocs.
 * Can be useful for defining an interface for a meta system component
 * and supplying a map of functions for the underlying data.
 */
export type ProcessMap<T> = { [index: string]: Process<T> }
export type MetaProcMap<T, MM extends ProcessMap<T> = {}> = { [K in keyof MM]: MetaProc<T> }

export const metaProcMap = <T, MM extends ProcessMap<T>> (procMap: MM): MetaProcMap<T, MM> => {
  const result: MetaProcMap<T> = {}
  Object.keys(procMap).forEach(key => Object.assign(result, { [key]: metaProc(procMap[key]) }))
  return result as MetaProcMap<T, MM>
}

/**
 * Replace the given meta within its parent with a new one made from the given value.
 */
export function replaceMeta <T, P = any> (meta: Meta<T, P>, value: T) {
  const parent = meta.$.parent
  const key = meta.$.key
  Object.assign(parent, { [key]: metafy(meta.$.spec, value, parent, key) })
}

/**
 * Get a value that is specified as either a literal or MetaProcess in the spec.
 * For an example of such a property see `mandatory` flag in `ValidationSpec`.
 */
export const specValue: MetaProc<any, any, keyof Policy.Specification<any>> = (meta, specKey) => {
  const specProp = meta.$.spec[specKey]
  return typeof specProp === "function"
    ? specProp(meta)
    : specProp
}
