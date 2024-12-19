import { parse as flat_parse, stringify as flat_stringify } from "flatted"
import { Meta, Meta$, metafy, MetaModel, modelKeys } from "metaliq"
import { filterObject } from "@metaliq/util"

/**
 * Policy registration.
 */
export const SERIALIZATION = () => {}

/**
 * This module supports serialising Meta objects along with their meta-state.
 *
 * Note that for standard persistence purposes it is usually simpler and sufficient
 * to serialise the underlying data state using `JSON.stringify` and `JSON.parse`.
 *
 * This meta-state serialisation is intended for purposes such as
 * application logging, monitoring, testing and automation.
 *
 * The serialisation will preserve any state values that pass the given predicate,
 * or the default predicate which preserves state values of type
 * boolean, number or string.
 */

/**
 * Serialise a Meta object including its meta-state.
 */
export function stringify (meta: Meta<any>, statePredicate = defaultStatePredicate) {
  return flat_stringify(meta, (key, val) => {
    if (key === "$") {
      const { meta, parent$, key, value, index } = val as Meta$<any>
      const state = filterObject(val.state, statePredicate)
      return { meta, parent$, key, value, index, state }
    } else {
      return val
    }
  })
}

/**
 * Deserialise a serialisation into a Meta object.
 */
export function parse<T> (serialisation: string, model: MetaModel<T>): Meta<T> {
  if (!serialisation) return null
  const parsed: Meta<T> = flat_parse(serialisation)
  const meta = metafy(model, parsed.$.value)

  const assignState = <T>(meta: Meta<T>, parsed: Meta<T>, model: MetaModel<T>) => {
    Object.assign(meta.$.state, parsed?.$?.state)
    const keys = modelKeys(model)
    for (const key of keys) {
      const childMeta = meta[key]
      const parsedChildMeta = parsed[key]
      if (childMeta && parsedChildMeta) {
        const childModel = meta[key].$.model
        assignState(childMeta as Meta<unknown>, parsedChildMeta as Meta<unknown>, <unknown>childModel as MetaModel<unknown>)
      }
    }
  }
  assignState(meta, parsed, model)

  return meta
}

/**
 * The default predicate for meta-state property inclusion in the serialisation.
 * Prevents attempted serialisation of functions.
 */
export const defaultStatePredicate = (key: string, value: any) =>
  ["boolean", "number", "string", "object"].includes(typeof value)
