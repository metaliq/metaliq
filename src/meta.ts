import { Policy } from "./policy"
import { MaybeReturn } from "./util/util"

/**
 * A Meta object with underlying value of type T,
 * optionally within parent of type P.
 */
export type Meta<T, P = any> = MetaFields<T> & Meta$<T, P>

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
 * The meta information for an array field,
 * along with a collection of Meta objects associated with its content.
 */
export type MetaArray<T, P = any> = Array<Meta<T, P>> & Meta$<T[], P>

/**
 * An object that has a $ link to meta information.
 * Both Meta and MetaArray implement this type.
 */
export type Meta$<T, P = any> = { $: MetaInfo<T, P> }

/**
 * Dollar property containing additional info.
 * This is the full meta-structure for non-object types.
 */
export type MetaInfo<T, P = any> = {
  /**
   * Link to the meta object or array containing this $ property.
   * Useful for backlinks from object values.
   * Note that for MetaArrays this will need to be cast.
   */
  meta?: Meta$<T, P>

  /**
   * Ancestry within meta graph (if applicable)
   */
  parent?: Meta<P>

  /**
   * Key within parent meta (if applicable).
   */
  key?: FieldKey<P>

  /**
   * The specification upon which this Meta was based.
   */
  spec: MetaSpec<T, P>

  /**
   * The runtime Meta state.
   */
  state: Policy.State<T, P>

  /**
   * The underlying data value.
   */
  value?: T
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
  spec: MetaSpec<T, P>, value: T, parent?: Meta<P>, key?: FieldKey<P>, proto?: Meta$<T>
): Meta<T, P> {
  const hasProto = !!proto
  // Establish the correct form of prototype for this meta
  proto = proto || (
    spec.items || Array.isArray(value)
      ? new MetaArrayProto()
      : Object.create(MetaProto)
  )

  // Create contextual meta information object
  const $: MetaInfo<T, P> = {
    spec,
    value,
    parent,
    key,
    state: proto?.$?.state || {}
  }
  const meta: Meta<T, P> = <unknown>Object.assign(proto, { $ }) as Meta<T, P>

  // Assign the meta object to itself - useful for backlinks from values
  meta.$.meta = meta

  // Create backlink from value object to meta object to enable moving to and fro
  if (value && typeof value === "object") Object.assign(value, { $ })

  // Assign the meta into its parent if provided
  if (parent && key && !(parent[key] instanceof MetaArrayProto)) {
    Object.assign(parent, { [key]: meta }) // (Re)attach this meta to its parent
    Object.assign(parent.$.value || {}, { [key]: value }) // (Re)attach the new value to the parent's value
  }

  // Descend through children creating further meta objects
  if (spec.items) {
    const valueArr = <unknown>value as any[] || []
    const metaArr = <unknown>meta as MetaArray<any, P>
    metaArr.length = 0 // Remove any items from supplied prototype
    for (const item of valueArr) {
      metaArr.push(metafy(spec.items, item, parent, key))
    }
  } else {
    for (const fieldKey of fieldKeys(spec)) {
      const fieldValue = value?.[fieldKey]
      const fieldSpec = meta.$.spec.fields[fieldKey]
      const fieldMeta = (meta[fieldKey] ?? null) as Meta<any> // Re-attach to the existing meta
      if (fieldSpec) metafy(fieldSpec, fieldValue, meta, fieldKey, fieldMeta)
    }
  }

  if (!hasProto) setupMeta(meta) // Only do initial meta setup if no previous meta provided

  return meta
}

/**
 * Process to commit the current state of the embedded / nested value object to the given meta.
 * Any values that were originally null stay null if all recursively nested sub-values are null,
 * but if any of the nested sub-values have been populated then the higher level value
 * is initialised to an object with the sub-values assigned to it.
 */
export function commit<T> (meta: Meta<T>) {
  if (meta.$.spec.items) {
    const metaArr = <unknown>meta as MetaArray<any>

    // Initialise value array if empty
    const value = <unknown>meta.$.value as any[] || []
    Object.assign(meta.$, { value })

    // Replace previous values with (maybe the same) current ones
    value.length = 0
    for (const metaItem of metaArr) {
      commit(metaItem)
      value.push(metaItem.$.value)
    }
  } else {
    const keys = fieldKeys(meta.$.spec)
    for (const key of keys) {
      const metaField = meta[key] as Meta<any>
      commit(metaField)
    }
  }

  // Commit meta for primitive value
  const primitives = ["string", "number", "boolean", "bigint"]
  if (primitives.includes(typeof meta.$.value)) {
    // Assign value and ensure parent value chain exists
    const setParentValue = <T, P>(child: Meta<T, P>) => {
      const { parent, key, value } = child.$
      if (!parent) return
      parent.$.value = parent.$.value || {} as P
      parent.$.value[key] = <unknown>value as P[FieldKey<P>]
      if (!parent.$.parent?.$.value?.[parent.$.key]) {
        setParentValue(parent)
      }
    }
    setParentValue(meta)
  }
}

/**
 * Resets the Meta's data value, to any provided value else the original underlying data.
 */
export function reset<T> (meta: Meta$<T>, value?: T) {
  metafy(meta.$.spec,
    typeof value === "undefined" ? meta.$.value : value,
    meta.$.parent, meta.$.key, meta)
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
 * Shortcut from a value object to the $ meta info.
 */
export const m$ = <T>(value: T): MetaInfo<T> => (<unknown>value as Meta$<T>)?.$

/**
 * Typed shortcut from a value object to its associated meta.
 */
export const meta = <T>(value: T): Meta<T> => (m$(value).meta as Meta<T>)

/**
 * Typed shortcut from a value array to its associated meta array.
 */
export const metarr = <T>(value: T[]): MetaArray<T> => (m$(value).meta as MetaArray<T>)

/**
 * A type guard to narrow a meta field to either a Meta or a MetaArray.
 */
export const isMetaArray = (m: Meta<any> | MetaArray<any>): m is MetaArray<any> => Array.isArray(m)

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
 * Basic function on an underlying data value.
 * Could be a pure function to provide a derived value,
 * or could return a process function that takes further values,
 * in which case the convention is that it may mutate the provided value
 * but no other side effect should be produced.
 */
export type Fn<T, R = any> = (value: T) => R

/**
 * A function on a meta object or array.
 */
export type MetaFn<T, P = any, R = any> = (meta: Meta$<T, P>) => R

/**
 * Return a MetaFn for the given Fn.
 */
export const metaFn = <T, R = any> (calc: Fn<T, R>): MetaFn<T, any, R> => (meta: Meta$<T>): R => calc(meta.$.value)

/**
 * Single level function currying. Can be a useful pattern.
 * Convert a curried calc (that takes a value of W and returns a function that takes a value of T and returns R)
 * into a function that takes a Meta of W and returns a function that takes a Meta of T and returns R.
 * TODO: Move this to a util library and extend out to provide multi-level currying - not as common but may be handy.
 */
export const metaCurry = <W, T, R = any> (fn: Fn<W, Fn<T, R>>, w: Meta$<W>): MetaFn<T, any, R> => {
  return metaFn(metaFn(fn)(w))
}
