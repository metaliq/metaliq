import { Policy } from "./policy"
import { MaybeReturn } from "./util/util"

/**
 * A Meta object with underlying value of type T,
 * optionally within parent of type P.
 */
export type Meta<T, P = any, C = any> = MetaFields<T> & Meta$<T, P, C>

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
export type Meta$<T, P = any, C = any> = { $: MetaInfo<T, P, C> }

/**
 * Dollar property containing additional info.
 * This is the full meta-structure for non-object types.
 */
export type MetaInfo<T, P = any, C = any> = {
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

  /**
   * The values of calculated fields.
   */
  calcs: C
}

/**
 * Type for calculated field functions for a Meta object.
 */
export type MetaCalcs<T, P = any, C = any> = {
  [K in FieldKey<C>]: MetaFn<T, P, C, C[K]>
}

/**
 * Specification for a given Type and optional Parent.
 */
export type MetaSpec<T, P = any, C = any> = Policy.Specification<T, P, C> & {
  fields?: T extends any[]
    ? never
    : { [K in FieldKey<T>]?: MetaSpec<T[K], T> }
  items?: T extends Array<infer I>
    ? MetaSpec<I>
    : never
  calcs?: MetaCalcs<T, P, C>
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
    state: proto?.$?.state || {},
    calcs: {}
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
  } else if (!Array.isArray(value)) {
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
      if (!parent || parent[key] instanceof MetaArrayProto) return
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
export const m$ = <T>(value: T | Meta<T>): MetaInfo<T> => (<unknown>value as Meta$<T>)?.$

/**
 * Typed shortcut from a value object to its associated meta.
 */
export const meta = <T, P = any, C = any> (value: T | MetaProxy<T, P, C> | Meta<T, P, C>) => {
  if (!(value ?? false) || typeof value !== "object") {
    throw new Error(`Attempt to obtain meta from primitive value: ${value}`)
  }
  return m$(value)?.meta as Meta<T, P, C>
}

/**
 * Typed shortcut from a value array to its associated meta array.
 */
export const metarr = <T>(value: T[]): MetaArray<T> => (m$(value)?.meta as MetaArray<T>)

/**
 * A type guard to narrow a meta field to either a Meta or a MetaArray.
 */
export const isMetaArray = (m: Meta<any> | MetaArray<any>): m is MetaArray<any> => Array.isArray(m)

/**
 * Shortcut to a proxy object for the parent.
 */
export const parent = <T extends object, P = any, C = any> (m: T | Meta<T, P, C>) => metaProxy((<Meta$<T, P, C>>m).$.parent)

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
 * A MetaFn receives two parameters - a data value proxy and the meta itself.
 * The proxy has the same type as the underlying data value and can generally
 * be treated as if it is that value. However, in the case where a meta has
 * uncommitted transient values, these values will be returned by the proxy.
 * The second parameter is the full meta object, with all attached meta-information.
 * If you need to get to the currently committed state of an underlying value object,
 * then it can be accessed via meta.$.value.
 */
export type MetaFn<T, P = any, C = any, R = any> = (value: T | MetaProxy<T, P, C>, meta?: Meta<T, P, C>) => R

/**
 * A proxy object for a meta, appears similarly to its value.
 * Will set or return uncommitted transient values where present (i.e. defined in the spec).
 * Any property access or manipulation on fields that are not included in the spec will
 * fall back to getting or setting the underlying data value.
 */
export type MetaProxy <T, P = any, C = any> = T extends object ? T & Meta$<T, P, C> : T

/**
 * Shortcut to call a metaFn by passing just the Meta.
 * This is intended for use at the policy level.
 */
export const metaCall = <T, P = any, R = any, C = any> (
  fn: MetaFn<T, P, C, R>
) => (on: T | Meta<T, P, C>): R => {
    if (typeof (on ?? false) !== "object") {
      throw new Error(`Cannot perform metaCall on primitive value: ${on}`)
    }
    const m = meta(on)
    const value = on !== m && on !== m.$.value
      ? on as MetaProxy<T, P, C> // on is already a meta-proxy
      : metaProxy(m)
    return fn(value, m)
  }

/**
 * A simple type guard for values that may or may not be a meta function.
 */
export const isMetaFn = (value: any): value is MetaFn<any> => typeof value === "function"

/**
 * Return a proxy for a given Meta object's values.
 */
export const metaProxy = <T>(meta: Meta<T>): MetaProxy<T> => {
  if (isMetaArray(meta)) {
    const valueArr = meta.$.value
    if (meta.length !== valueArr.length &&
      typeof valueArr[0] !== "object" &&
      typeof meta.$.value[0] !== "object"
    ) {
      // Array of primitives
      return meta.$.value as MetaProxy<T>
    } else {
      return <unknown>Object.assign(
        [...meta.map(m => metaProxy(m))],
        { $: meta.$ }
      ) as MetaProxy<T>
    }
  } else if (typeof meta.$.value === "object") {
    return <unknown>(new Proxy(meta, {
      get<K extends FieldKey<T>> (target: Meta<T>, p: K): any {
        if (p === "$") {
          return target.$
        } else if (typeof target[p] === "object") {
          return metaProxy(<unknown>target[p] as Meta<T[K]>)
        } else {
          // No spec for this field
          return target.$.value[p]
        }
      },

      set (target: Meta<T>, p: FieldKey<T>, newValue: any) {
        const isMeta = (obj: unknown): obj is Meta<unknown> => typeof obj === "object"
        const targetMeta = target[p]

        if (isMeta(targetMeta)) {
          const oldValue = target[p].$.value
          if (oldValue && typeof oldValue === "object" && typeof newValue === "object") {
            const proxy = metaProxy(targetMeta)
            for (const [key, value] of Object.entries(newValue)) {
              (proxy as any)[key] = value
            }
          } else {
            target[p].$.value = newValue
          }
        } else {
          // No spec for this field
          target.$.value[p] = newValue
        }
        return true
      }
    })) as MetaProxy<T>
  } else return meta.$.value as MetaProxy<T>
}

type SpecKey = keyof Policy.Specification<any>
type SpecValue<K extends SpecKey> = Policy.Specification<any>[K]
type DerivedSpecValue<K extends SpecKey> = Exclude<SpecValue<K>, MetaFn<any>>

/**
 * Return the value of a spec term that is defined as being
 * either a particular type or a MetaFn that returns that type.
 */
export const getSpecValue = <K extends SpecKey, V extends DerivedSpecValue<K>>(key: K) =>
  (meta: Meta$<any>): V => {
    const specValue = meta.$.spec[key]
    if (isMetaFn(specValue)) return metaCall(specValue)(meta)
    else return specValue as V
  }
