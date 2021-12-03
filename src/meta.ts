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
 * An object (generally a Meta or MetaArray) with a $ property of type MetaInfo.
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
  spec: MetaSpec<T, P>, value: T, parent?: Meta<P>, key?: FieldKey<P>, proto?: Meta<T>
): Meta<T, P> {
  // Establish the correct form of prototype for this meta
  proto = proto || (
    spec.items
      ? new MetaArrayProto()
      : Object.create(MetaProto)
  )

  // Create contextual meta information object
  const $: MetaInfo<T, P> = {
    spec,
    value,
    parent,
    key,
    state: (m$(value)?.state || parent?.[key]?.$?.state || {}) as Policy.State<T, P>
  }
  const meta: Meta<T, P> = <unknown>Object.assign(proto, { $ }) as Meta<T, P>

  // Assign the meta object to itself - useful for backlinks from values
  meta.$.meta = meta

  // Create backlink from value object to meta object to enable moving to and fro
  if (value && typeof value === "object") Object.assign(value, { $ })

  // Assign the meta into its parent if provided
  if (parent && key && !(parent[key] instanceof MetaArrayProto)) Object.assign(parent, { [key]: meta })

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
      if (fieldSpec) metafy(fieldSpec, fieldValue, meta, fieldKey)
    }
  }

  setupMeta(meta)

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
    const value = <unknown>meta.$.value as any[] || []
    Object.assign(meta.$, { value }) // Initialise value array if empty

    const metaArr = <unknown>meta as MetaArray<any>
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

  // Commit primitive value
  if (meta.$.parent && typeof meta.$.value !== "object") {
    meta.$.parent.$.value = meta.$.parent.$.value || {} // Create parent value if was previously null
    meta.$.parent.$.value[meta.$.key] = meta.$.value
  }
}

/**
 * (Re)sets the Meta's data value, to any provided value else the original underlying data.
 */
export function set<T> (meta: Meta<T>, value?: T) {
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
 * Get a value that is specified as either a literal or MetaProcess in the spec.
 * For an example of such a property see `mandatory` flag in `ValidationSpec`.
 */
export const specValue: MetaProc<any, any, keyof Policy.Specification<any>> = (meta, specKey) => {
  const specProp = meta.$.spec[specKey]
  return typeof specProp === "function"
    ? specProp(meta)
    : specProp
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
 * Works better than keyof T where you know that T is not an array.
 */
export type FieldKey<T> = Exclude<Extract<keyof T, string>, "__typename">

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
  const result = proc(meta.$.value, message)
  set(meta)
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
 * Basic calculation (deduction or derived value) on a value.
 * By convention, this should be a pure function which modifies nothing.
 */
export type Calc <T, R = any> = (value: T) => R

/**
 * A calculation (deduction or derived value) on a meta object or array.
 */
export type MetaCalc <T, P = any, R = any> = (meta: Meta$<T, P>) => R

/**
 * Return a MetaCalc for the given Calc.
 */
export const metaCalc = <T, R = any> (calc: Calc<T, R>): MetaCalc<T, any, R> => (meta: Meta$<T>): R => calc(meta.$.value)

/**
 * Single level function currying. Can be a useful pattern.
 * Convert a curried calc (that takes a value of W and returns a function that takes a value of T and returns R)
 * into a function that takes a Meta of W and returns a function that takes a Meta of T and returns R.
 * TODO: Extend this out to provide multi-level currying - not as common but may be handy.
 */
export const metaCurry = <W, T, R = any> (fn: Calc<W, Calc<T, R>>, w: Meta$<W>): MetaCalc<T, any, R> => {
  return metaCalc(metaCalc(fn)(w))
}
