import { Constraint, Validator } from "../validation"
import { FieldKey, Fn, Meta } from "../../../meta"

/**
 * Checks equality with the given value.
 */
export const equals = (value: any, msg?: string): Validator<any> => meta =>
  meta.$.value === value || msg || "Wrong value"

/**
 * Checks equality with another field in the same parent.
 */
export const sameAs = <T, P>(other: FieldKey<P>, msg?: string): Validator<T, P> => meta => {
  const otherMeta = meta.$.parent[other] as Meta<any>
  return meta.$.value === otherMeta.$.value || msg || `Does not match ${otherMeta.$.spec.label}`
}

export const transform = <T> (fn: Fn<T, T>): Validator<T> => meta => {
  meta.$.value = fn(meta.$.value)
  return true
}

// ---- STRINGS ----

export const minLength: Constraint<string> = (min: number, msg?: string) => meta =>
  meta.$.value?.length >= min || msg || `Should be at least ${min} characters`

export const hasLength: Constraint<string> = (length: number, msg?: string) => meta =>
  meta.$.value?.length === length || msg || `Should be exactly ${length} characters`

export const notBlank = (msg?: string): Validator<string> => meta =>
  !!meta.$.value?.length || msg || "Cannot be blank"

export const blankOr = (other: Validator<string>): Validator<string> => meta =>
  !meta.$.value || other(meta)

export const siblingsBlankOr = <T, P>(siblings: Array<FieldKey<P>>, other: Validator<T>): Validator<T, P> => meta =>
  !siblings.map(key => meta.$.parent[key].$.value).filter(Boolean).length || other(meta)

export const matchRegex = (regex: RegExp, msg?: string): Validator<string> => meta =>
  !!meta.$.value.match(regex) || msg || "Does not match required pattern"

// ---- NUMBERS ----

export const min: Constraint<number> = (minVal: number, msg?: string) => meta =>
  meta.$.value >= minVal || msg || `Should be at least ${minVal}`

export const max: Constraint<number> = (maxVal: number, msg?: string) => meta =>
  meta.$.value <= maxVal || msg || `Should be no more than ${maxVal}`

// ---- COMBINATIONS ----

/**
 * A logical AND operator for validators.
 */
export const allOf = <T, P>(...validators: Array<Validator<T>>): Validator<T, P> => meta => {
  for (const validator of validators) {
    const result = validator(meta)
    if (result === false || typeof result === "string") return result
  }
  return true
}

/**
 * A logical OR operator for validators.
 * Should provide the message that is displayed if none of the conditions are met,
 * rather than trying to guess which is appropriate.
 */
export const oneOf = <T, P>(msg?: string, ...validators: Array<Validator<T>>): Validator<T, P> => meta => {
  for (const validator of validators) {
    const result = validator(meta)
    if (!(result === false || typeof result === "string")) return true
  }
  return msg || false
}
