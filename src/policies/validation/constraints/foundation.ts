import { Constraint, Validator } from "../validation"
import { FieldKey, Meta, MetaFn } from "../../../meta"

/**
 * Checks equality with the given value.
 */
export const equals = (equalTo: any, msg?: string): Validator<any> => value =>
  value === equalTo || msg || "Wrong value"

/**
 * Checks equality with another field in the same parent.
 */
export const sameAs = <T, P>(other: FieldKey<P>, msg?: string): Validator<T, P> => (value, meta) => {
  const otherMeta = meta.$.parent[other] as Meta<any>
  return value === otherMeta.$.value || msg || `Does not match ${otherMeta.$.spec.label}`
}

export const transform = <T> (fn: MetaFn<T, any, T>): Validator<T> => (value, meta) => {
  meta.$.value = fn(value, meta)
  return true
}

// ---- STRINGS ----

export const minLength: Constraint<string> = (min: number, msg?: string) => value =>
  value?.length >= min || msg || `Should be at least ${min} characters`

export const maxLength: Constraint<string> = (min: number, msg?: string) => value =>
  value?.length <= min || msg || `Should not be more than ${min} characters`

export const hasLength: Constraint<string> = (length: number, msg?: string) => value =>
  value?.length === length || msg || `Should be exactly ${length} characters`

export const notBlank = (msg?: string): Validator<string> => value =>
  !!value?.length || msg || "Cannot be blank"

export const blankOr = (other: Validator<string>): Validator<string> => (value, meta) =>
  !value || other(value, meta)

export const siblingsBlankOr = <T, P>(siblings: Array<FieldKey<P>>, other: Validator<T>): Validator<T, P> => (value, meta) =>
  !siblings.map(key => meta.$.parent[key].$.value).filter(Boolean).length || other(value, meta)

export const matchRegex = (regex: RegExp, msg?: string): Validator<string> => value =>
  !!value.match(regex) || msg || "Does not match required pattern"

// ---- NUMBERS ----

export const min: Constraint<number> = (minVal: number, msg?: string) => value =>
  value >= minVal || msg || `Should be at least ${minVal}`

export const max: Constraint<number> = (maxVal: number, msg?: string) => value =>
  value <= maxVal || msg || `Should be no more than ${maxVal}`

// ---- COMBINATIONS ----

/**
 * A logical AND operator for validators.
 */
export const allOf = <T, P>(...validators: Array<Validator<T>>): Validator<T, P> => (value, meta) => {
  for (const validator of validators) {
    const result = validator(value, meta)
    if (result === false || typeof result === "string") return result
  }
  return true
}

/**
 * A logical OR operator for validators.
 * Should provide the message that is displayed if none of the conditions are met,
 * rather than trying to guess which is appropriate.
 */
export const oneOf = <T, P>(msg?: string, ...validators: Array<Validator<T>>): Validator<T, P> => (value, meta) => {
  for (const validator of validators) {
    const result = validator(value, meta)
    if (!(result === false || typeof result === "string")) return true
  }
  return msg || false
}
