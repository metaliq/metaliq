/**
 * A collection of meta functions useful in functional composition patterns.
 */

import { FieldKey, type MetaFn } from "./metaliq"

/**
 * Returns the field value.
 */
export const val: MetaFn<any> = $ => $.value

/**
 * Sets and returns the field value.
 */
export const set = <T>(value: T): MetaFn<T> => $ => {
  $.value = value
  return val($)
}

/**
 * Return the result of the given function on the given child field.
 *
 * If no function is provided, the `val` function is used, so the field's value is returned.
 */
export function on <T, K extends FieldKey<T>> (key: K, metaFn: MetaFn<T[K]> = val): MetaFn<T> {
  return ($, event) => $.on(key, metaFn, event)
}

/**
 * Reverses the boolean value of calling the provided function.
 */
export const not = <T = any, P = any> (fn: MetaFn<T, P>): MetaFn<T, P, boolean> => $ =>
  !fn($)

/**
 * Returns true if any of the provided functions return a truthy result.
 */
export const or = <T = any, P = any> (...fns: Array<MetaFn<T, P>>): MetaFn<T, P, boolean> => $ =>
  fns.some(fn => fn($))

/**
 * Returns true if all the provided functions return a truthy result.
 */
export const and = <T = any, P = any> (...fns: Array<MetaFn<T, P>>): MetaFn<T, P, boolean> => $ =>
  fns.every(fn => fn($))

/**
 * Returns the result of the given function for the parent.
 */
export const onParent = <T = any, P = any, R = any> (fn: MetaFn<P, any, R> = val): MetaFn<T, P, R> => $ =>
  fn($.parent$)

/**
 * Returns true if the data is equal to the given value.
 */
export const isEqualTo = <T = any, P = any> (value: T): MetaFn<T, P, boolean> => $ =>
  $.value === value

/**
 * Returns the data value or a fallback value if null or undefined.
 */
export const valOr = <T = any, P = any> (value: T): MetaFn<T, P, T> => $ =>
  $.value ?? value

/**
 * Returns true if the data value is NOT null or undefined.
 */
export const isNotNull: MetaFn<any> = $ => ($.value ?? null) !== null

/**
 * Return the length of an array or string data value.
 */
export const length: MetaFn<any[] | string> = $ => $.value.length
