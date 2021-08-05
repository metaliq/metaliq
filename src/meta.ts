import { Policy } from "./policy"

/**
 * Meta-structure of Type in optional Parent with optional Update processes.
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
    // Ancestry within object graph (if applicable)
    parent?: Meta<P>
    key?: FieldKey<P>

    // Specification and State
    spec: MetaSpec<T, P>
    state: Policy.State<T, P>

    // Underlying value getter and setter
    value?: T
    set: (val: T) => void
  }
}

/**
 * Associated meta-processes.
 */
export type MetaUpdate<T> = (meta: Meta<T>, event?: Event) => any
export type MetaUpdateMaker<T> = (...params: any[]) => MetaUpdate<T>
export type MetaUpdateMap<T> = { [index: string]: MetaUpdate<T> }

/**
 * Specification for a given Type, optional Parent and set of Update processes.
 */
export type MetaSpec<T, P = any> = Policy.Specification<T, P> & {
  fields?: {
    [K in FieldKey<T>]?: MetaSpec<T[K], T>
  }
  items?: T extends Array<infer I> ? MetaSpec<I> : never
}

/**
 * Provider of initial meta state, to be implemented in policy modules.
 */
export type MetaStateMaker<T, P = any> = (
  value?: T, spec?: MetaSpec<T, P>, parent?: P, key?: keyof P
) => Policy.State<T, P>

/**
 * Register of modular providers for initial field properties.
 */
const metaStateMakers: Array<MetaStateMaker<any>> = []
export function initMetaState (maker: MetaStateMaker<any>) {
  metaStateMakers.push(maker)
}

const MetaProto = {
  toString () {
    return this?.$?.value?.toString() || this
  }
}

/**
 * Create a Meta object with the given spec, value and optional parent and key.
 */
export function metafy <T, P = any> (
  spec: MetaSpec<T, P>, value: T, parent?: Meta<P>, key?: FieldKey<P>
): Meta<T, P> {
  const m$ = meta$(spec, value, parent, key)
  const proto = Object.create(MetaProto)
  const meta: Meta<T, P> = <unknown>Object.assign(proto, m$) as Meta<T, P>

  for (const maker of metaStateMakers) {
    Object.assign(meta.$.state, maker(value, spec, parent, key))
  }

  const fields = fieldKeys(spec)
  for (const fieldKey of fields) {
    const fieldValue = value?.[fieldKey]
    metaset(meta, fieldKey, fieldValue)
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
      state: {},
      value,
      set: (val: T) => metaset(parent, key, <any>val as P[FieldKey<P>])
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
    const metaArr = Object.assign(arr, arr$)
    Object.assign(parent, { [key]: metaArr })
  } else {
    Object.assign(parent, { [key]: metafy(fieldSpec, value, parent, key) })
  }
}

/**
 * Shortcut to get the stored value.
 */
export const v = <T>(meta: Meta<T>): T => meta.$.value

export type FieldKey<T> = Extract<keyof T, string>

/**
 * Return the keys of a field spec.
 */
export const fieldKeys = <T>(spec: MetaSpec<T>) =>
  Object.keys(spec?.fields || {}) as Array<FieldKey<T>>

/**
 * Process to commit the nested meta values to the value of the given meta.
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
 * Applies the given value recursively to the superstate's primitive field sub-values.
 * This function is useful for applying an externally sourced value to a superstate
 * prior to then committing that value.
 * Calling this function followed by a commit would set all object values within the superstate.
 */
export function applyToMeta<T> (meta: Meta<T>, value: T) {
  if (!meta.$.spec) return
  if (meta.$.spec.fields) { // Object value - recurse
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
 * For a given function of T, return a function of Meta<T>
 * which applies any change to the underlying T to the Meta.
 */
export const morph = <T> (proc: (t: T) => any) => (meta: Meta<T>) => {
  const result = proc(v(meta))
  applyToMeta(meta, v(meta))
  return result
}

/**
 * Replace the given meta with a new one made from the given value.
 */
export function replaceMeta <T, P = any> (meta: Meta<T, P>, value: T) {
  const parent = meta.$.parent
  const key = meta.$.key
  Object.assign(parent, { [key]: metafy(meta.$.spec, value, parent, key) })
}
