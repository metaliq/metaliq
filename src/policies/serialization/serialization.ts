import { parse as flat_parse, stringify as flat_stringify } from "flatted"
import { applySpec, Meta, MetaSpec } from "../../meta"
import { filterObject } from "../../util/util"

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
      const { meta, parent, key, value } = val
      const state = filterObject(val.state, statePredicate)
      return { meta, parent, key, value, state }
    } else {
      return val
    }
  })
}

/**
 * Deserialise a serialisation into a Meta object.
 */
export function parse<T> (serialisation: string, spec?: MetaSpec<T>): Meta<T> {
  const meta: Meta<T> = flat_parse(serialisation)
  if (spec) applySpec(meta.$, spec)
  return meta
}

/**
 * The default predicate for meta-state property inclusion in the serialisation.
 * Values of type string, boolean and number will pass.
 */
export const defaultStatePredicate = (key: string, value: any) => ["boolean", "number", "string"].includes(typeof value)
