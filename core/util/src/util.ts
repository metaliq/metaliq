import { FieldKey } from "metaliq"

// TYPESCRIPT UTILITIES

/**
 * An EndoFunction returns the same type as its (single) parameter.
 */
export type EndoFunction = <T> (o: T) => T

/**
 * Return type for a function that returns either the given type or void.
 */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type MaybeReturn <T> = T | void

/**
 * Shorthand assertive type-cast. Use with care. Instead of:
 * ```ts
 * <unknown>value as <Type>
 * ```
 * use:
 * ```ts
 * as<Type>(value)
 * ```
 */
export const as = <T> (value: any): T => value as T

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

/**
 * The type of the key(s) parameter for {@link sortBy}.
 * Allows specifying the key of an object type,
 * optionally preceded by the `-` character.
 */
export type SortKey<T> = `${"-" | ""}${FieldKey<T>}`

/**
 * Return a function to sort by the given key(s).
 * Each key can be preceded by a `-` character to perform a descending sort.
 */
export function sortBy<T> (...keys: Array<SortKey<T>>) {
  type ParsedSortKey = {
    fieldName: keyof T
    descending: boolean
  }

  const parsedKeys: ParsedSortKey[] = keys.map(key => {
    const matches = key.match(/^(-?)(.*)/)
    const descending = matches[1] === "-"
    const fieldName = matches[2] as keyof T
    return { descending, fieldName }
  })

  return (a: T, b: T) => {
    if (a === null && b !== null) return -1
    if (b === null && a !== null) return 1
    for (const { fieldName, descending } of parsedKeys) {
      if (a[fieldName] < b[fieldName]) return descending ? 1 : -1
      if (b[fieldName] < a[fieldName]) return descending ? -1 : 1
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
 * Append the second array to the first and return it.
 */
export function appendTo<T> (to: T[], append: T[]) {
  to.splice(to.length, 0, ...append)
  return to
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
 * Make a dereferenced copy of obj,
 * with the option of either excluding or including certain fields.
 */
export function copy<T> (obj: T, { exclude, include }: { exclude?: string[], include?: string[] } = {}): T {
  const filter = exclude
    ? ([k]: [string, any]): boolean => !exclude.includes(k)
    : include
      ? ([k]: [string, any]): boolean => include.includes(k)
      : () => true
  return typeof (obj ?? false) === "object"
    ? Array.isArray(obj)
      ? [...(Array.from(obj.values()).map(v => copy(v)))] as T
      : Object.fromEntries(Object.entries(obj)
        .filter(filter)
        .map(([k, v]: [string, any]) => [k, copy(v)])
      ) as T
    : obj
}

/**
 * Return a function that transforms an object according to a predicate,
 * which takes [key, value] property entries and returns entries for the new object.
 *
 * This allows the transformation of either keys and/or values.
 *
 * Any entry whose returned _key_ is null or undefined will be excluded.
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
 * Filter an object to a subset of values based on a predicate applied to each value.
 * Produces an object with only the keyed values from the original object that match the predicate.
 * Filtering is recursive throughout an object graph.
 */
export const filterObject = <T, K extends keyof T>(
  obj: T, predicate: (k: K, v: T[K]) => boolean
): Partial<T> => {
  if (Array.isArray(obj)) return obj.map(el => filterObject(el, predicate)) as T
  if (!obj || typeof obj !== "object") return obj
  const filteredEntries = Object.entries(obj)
    .map(([k, v]) => predicate(k as K, v) ? { [k]: filterObject(v, predicate) } : false)
    .filter(Boolean)
  const result = <unknown>Object.assign({}, ...filteredEntries) as Partial<T>
  return result
}

/**
 * Similar to filterObject but produces the result as a list of resulting values.
 */
export const searchObject = <T, K extends keyof T>(obj: T, search: (k: K, v: T[K]) => boolean) => {
  const filtered = filterObject(obj, search)
  return Object.values(filtered)
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

/**
 * Very simple capitalisation function.
 */
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

// MISCELLANEOUS UTILITIES

/**
 * Simple wait function, useful in simulating and mocking async operations.
 */
export function wait (delay: number = 1000) {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}

/**
 * Test two variables for equality by value rather than reference.
 * Ignores meta value content, i.e. any property with key `$`.
 *
 * Adapted from example JS code at:
 * https://www.30secondsofcode.org/js/s/equals
 */
export function equals (a: any, b: any): boolean {
  if (a === b) return true

  if (!a || !b || (typeof a !== "object" && typeof b !== "object")) {
    return a === b
  }

  if (a.prototype !== b.prototype) return false

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  const keys = Object.keys(a).filter(k => k !== "$")
  if (keys.length !== Object.keys(b).length) return false

  return keys.every(k => equals(a[k], b[k]))
}

/**
 * JSON Stringify that excludes `$` keys, i.e. meta values, from value objects.
 */
export const jsonifyValue = (value: any) => JSON.stringify(value, (k, v) => k === "$" ? undefined : v)
