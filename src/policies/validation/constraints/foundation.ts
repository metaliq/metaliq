import { Constraint, Validator } from "../validation"
import { FieldKey } from "../../../meta"

/** Strings **/

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

/** Numbers **/

export const min: Constraint<number> = (minVal: number, msg?: string) => meta =>
  meta.$.value >= minVal || msg || `Should be at least ${minVal}`

export const max: Constraint<number> = (maxVal: number, msg?: string) => meta =>
  meta.$.value <= maxVal || msg || `Should be no more than ${maxVal}`

/** Combinations **/

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
