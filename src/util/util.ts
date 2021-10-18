import { parse, stringify } from "flatted"

export type Maybe<T> = T | null

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type MaybeReturn <T> = T | void

export function sortBy<T> (keyOrKeys: keyof T | Array<keyof T>) {
  const keys: Array<keyof T> = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys]
  return (a: T, b: T) => {
    if (a === null && b !== null) return -1
    if (b === null && a !== null) return 1
    for (const key of keys) {
      if (a[key] < b[key]) return -1
      if (b[key] < a[key]) return 1
    }
    return 0
  }
}

export function extractKeys<T> (obj: T, ...keys: Array<keyof T>): Partial<T> {
  const result: Partial<T> = {}
  for (const key of keys) {
    result[key] = obj[key]
  }
  return result
}

export const capitalize = (str: string) => str.substr(0, 1).toUpperCase() + str.substr(1)

export const isAre = (num: number) => num === 1 ? "is" : "are"

export const plural = (num: number) => num === 1 ? "" : "s"

// Return true if the given term is present in any of the given target strings.
// Case insensitive.
export const textSearch = (term: string, ...targets: string[]) => {
  const target = targets.join(" ")
  return target.toLowerCase().search(term.toLowerCase()) >= 0
}

// Make a dereferenced copy of obj, with the option of either excluding or including certain fields.
export function copy<T> (obj: T, { exclude, include }: { exclude?: string[], include?: string[] } = {}): T {
  const flatted = exclude
    ? stringify(obj, (k: string, v: any) => exclude.includes(k) ? undefined : v)
    : stringify(obj, include as Array<string | number>)
  return parse(flatted)
}

export const enumLabel = (value: string) => value.split("_").map(capitalize).join(" ")

export function remove<T> (array: T[], item: T) {
  if (array.includes(item)) {
    array.splice(array.indexOf(item), 1)
    return true
  } else return false
}

export function pushTo<T> (array: T[], item: T) {
  array.push(item)
  return item
}

// Return the given value or a fallback value (which defaults to "") if it is null or undefined
export const valOr = (input: any, or: any = "") => (typeof input === "undefined" || input === null) ? or : input

// Return the given value if is is defined, or if it is an object then at least one of its direct children is defined
export const hasSomeVal = <T extends object>(obj: T, excludeKeys: string[] = []) => {
  if (typeof obj !== "undefined" && typeof obj !== "object") return obj
  for (const key in obj) {
    const val = <any>obj[key]
    if (!excludeKeys.includes(key) && typeof val !== "undefined") {
      return obj // Value was found, return the object
    }
  }
}

export function getKeyOf<T extends object> (obj: T, value: any) {
  for (const key in obj) {
    if (obj[key] === value) return key
  }
}

// Initialise any null / undefined members of the given object property names to an empty object
export const initObjProps = <T extends object>(obj: T, keys: Array<keyof T>) => {
  for (const key of keys) {
    obj[key] = obj[key] || <any>{}
  }
}

export const isFirst = (item: any, array: any[]) => item === array[0]
export const isLast = (item: any, array: any[]) => item === array.slice(-1)[0]

/**
 * Method to get the defined keys for an enum - excludes the auto-generated reverse mapping keys
 */
export const enumKeys = <T extends object>(obj: T): Array<keyof T> =>
  Object.keys(obj).filter(k => parseInt(k).toString() !== k) as Array<keyof T>

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
