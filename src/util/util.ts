import { parse, stringify } from "flatted"
import { FieldKey } from "../meta"

// TYPESCRIPT UTILITIES

/**
 * An EndoFunction returns the same type as its (single) parameter.
 */
export type EndoFunction = <T> (o: T) => T

/**
 * Return type for a function that returns either the given type or null.
 */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type MaybeReturn <T> = T | void

/**
 * Method to get the defined keys for an enum - excludes the auto-generated reverse mapping keys.
 * Provides a useful pattern for iterating over known keys of a given object with a common type,
 * by creating an enum of those keys and obtaining a list of them with this function, enabling code like:
 * ```
 * enum Day { mon, tue, wed, thu, fri, sat, sun }
 * const dayList = enumKeys(Day)
 * dayList.map(d => dailySupplies[d])
 * ```
 * In this example d will have the specific type of `dailySupplies.mon` etc.
 * despite `dailySupplies` potentially having other (non-day) keys.
 */
export const enumKeys = <T extends object>(obj: T): Array<keyof T> =>
  Object.keys(obj).filter(k => parseInt(k).toString() !== k) as Array<keyof T>

// ARRAY FUNCTIONS

export type SortKey<T> = `${"-" | ""}${FieldKey<T>}`

/**
 * Return a function to sort by the given key(s).
 * Each key can be preceded by a `-` character to perform a descending sort.
 */
export function sortBy<T> (keyOrKeys: SortKey<T> | Array<SortKey<T>>) {
  const keys: Array<SortKey<T>> = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys]
  return (a: T, b: T) => {
    if (a === null && b !== null) return -1
    if (b === null && a !== null) return 1
    for (const sortKey of keys) {
      const matches = sortKey.match(/^(-?)(.*)/)
      const desc = matches[0] === "-"
      const key = matches[1] as keyof T
      if (a[key] < b[key]) return desc ? 1 : -1
      if (b[key] < a[key]) return desc ? -1 : 1
    }
    return 0
  }
}

/**
 * Remove the given item from the given arary and return it.
 */
export function remove<T> (array: T[], item: T) {
  if (array.includes(item)) {
    array.splice(array.indexOf(item), 1)
    return item
  } else return null
}

/**
 * Push the given item to the given array and return it.
 */
export function pushTo<T> (array: T[], item: T) {
  array.push(item)
  return item
}

/**
 * Is this the first item in the array?
 */
export const isFirst = (item: any, array: any[]) => item === array[0]

/**
 * Is this the last item in the array?
 */
export const isLast = (item: any, array: any[]) => item === array.slice(-1)[0]

// OBJECT FUNCTIONS

/**
 * Create a new object with the given keys from the original.
 */
export function extractKeys<T> (obj: T, ...keys: Array<keyof T>): Partial<T> {
  const result: Partial<T> = {}
  for (const key of keys) {
    result[key] = obj[key]
  }
  return result
}

/**
 * Make a dereferenced copy of obj, with the option of either excluding or including certain fields.
 */
export function copy<T> (obj: T, { exclude, include }: { exclude?: string[], include?: string[] } = {}): T {
  const flatted = exclude
    ? stringify(obj, (k: string, v: any) => exclude.includes(k) ? undefined : v)
    : stringify(obj, include as Array<string | number>)
  return parse(flatted)
}

/**
 * Return a function that transforms an object according to a predicate,
 * which takes [key, value] property entries and returns entries for the new object.
 * Any entry whose returned key is null or undefined will be excluded.
 */
export type EntryPredicate = ([k, v]: [k: string, v: any], i: number) => [string, any]
export const objectTransformer = (fn: EntryPredicate) => (obj: any) =>
  Object.fromEntries(Object.entries(obj).map(fn).filter(([k]) => k ?? false))

/**
 * An object transformer that produces an object with any null or undefined values filtered out.
 */
export const onlyKeysWithVals = objectTransformer(([k, v]) => [
  (v ?? false) ? k : undefined, v
])

/**
 * Return the given value if is is defined, or if it is an object then at least one of its direct children is defined
 */
export const hasSomeVal = <T extends object>(obj: T, excludeKeys: string[] = []) => {
  if (typeof obj !== "undefined" && typeof obj !== "object") return obj
  for (const key in obj) {
    const val = <any>obj[key]
    if (!excludeKeys.includes(key) && typeof val !== "undefined") {
      return obj // Value was found, return the object
    }
  }
}

/**
 * Filter the object to a subset of values based on a predicate applied to each value.
 */
export const filterObject = <T, K extends keyof T>(obj: T, predicate: (k: K, v: T[K]) => boolean) => {
  const filteredEntries = Object.entries(obj)
    .map(([k, v]) => predicate(k as K, v) ? { [k]: v } : false)
    .filter(Boolean)
  const result = <unknown>Object.assign({}, ...filteredEntries) as Partial<T>
  return result
}

/**
 * Find the key of the given value in an object.
 * Where a given value exists multiple times in an object the first entry is returned.
 */
export function getKeyOf<T extends object> (obj: T, value: any) {
  for (const key in obj) {
    if (obj[key] === value) return key
  }
}

/**
 * Initialise any null / undefined members of the given object property names to an empty object
 */
export const initObjProps = <T extends object>(obj: T, keys: Array<keyof T>) => {
  for (const key of keys) {
    obj[key] = obj[key] || <any>{}
  }
}

// TEXT FUNCTIONS

export const capitalize = (str: string) => str.substr(0, 1).toUpperCase() + str.substr(1).toLowerCase()

/**
 * English language form of the verb "to be" appropriate for the plurality of the subject.
 */
export const isAre = (num: number) => num === 1 ? "is" : "are"

/**
 * Naive english language pluralizer.
 */
export const plural = (num: number) => num === 1 ? "" : "s"

/**
 * Return true if the given term is present in any of the given target strings.
 * Case insensitive.
 */
export const textSearch = (term: string, ...targets: string[]) => {
  const target = targets.join(" ")
  return target.toLowerCase().search(term.toLowerCase()) >= 0
}

// GRAPHQL UTILITIES

/**
 * Helper method for making GraphQL inputs from value objects.
 * Excludes keys $, __typename and any additional keys provided.
 */
export function inputObject <V extends object, I> (object: V, excludeKeys: string[] = []): I {
  excludeKeys = excludeKeys.concat(["$", "__typename"])
  const flatted = stringify(object, (k: string, v: any) =>
    excludeKeys.includes(k) ? undefined : hasSomeVal(v, excludeKeys)
  )
  return parse(flatted) as I
}

// MISCELLANEOUS UTILITIES

/**
 * Simple wait function, useful in simulating and mocking async operations.
 */
export function wait (delay: number = 1000) {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}
