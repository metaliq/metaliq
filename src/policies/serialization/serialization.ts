import { parse as flat_parse, stringify as flat_stringify } from "flatted"
import { applySpec, Meta, MetaSpec } from "../../meta"
import { filterObject } from "../../util/util"

/**
 * This module supports serialising Meta objects primarily for automation and integration purposes.
 * The serialisation is a string, and the deserialised $.value can be provided as the init of a spec
 * which will then resume the values of the original Meta and also be able to reapply any property
 * of its previous state that passes the state predicate provided to serialise.
 * The default predicate preserves state values of type boolean, number or string.
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

export function parse<T> (serialisation: string, spec?: MetaSpec<T>): Meta<T> {
  const meta: Meta<T> = flat_parse(serialisation)
  if (spec) applySpec(meta, spec)
  return meta
}

const defaultStatePredicate = (key: string, value: any) => ["boolean", "number", "string"].includes(typeof value)
