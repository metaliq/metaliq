import { parse as flat_parse, stringify as flat_stringify } from "flatted"
import { FieldKey, Meta, Meta$, metafy, MetaModel } from "metaliq"
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

  const assignState = <T>(meta: Meta<T>, parsed: Meta<T>) => {
    Object.assign(meta.$.state, parsed?.$?.state)
    if (Array.isArray(parsed.$.value)) {
      // TODO: Reassign meta array item state
    } else {
      const keys = Object.keys(parsed).filter(k => !k.match(/^\$/)) as Array<FieldKey<T>>
      for (const key of keys) {
        // Create a new childMeta if one does not exist to account for dynamically generated fields
        const childMeta = meta[key] ??=
          metafy({}, parsed[key].$.value, meta.$, key) as Meta<T>[FieldKey<T>]
        assignState(childMeta as Meta<unknown>, parsed[key] as Meta<unknown>)
      }
    }
  }
  assignState(meta, parsed)

  return meta
}

/**
 * The default predicate for meta-state property inclusion in the serialisation.
 * Prevents attempted serialisation of functions.
 * Enables indication that certain meta-state properties are not suitable for serialisation
 * by using the naming prefix `$_`.
 */
export const defaultStatePredicate = (key: string, value: any) =>
  !key.match(/^\$_/) &&
  ["boolean", "number", "string", "object"].includes(typeof value)
