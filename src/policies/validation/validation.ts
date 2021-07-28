import { initMetaState, Meta, fieldKeys } from "../../meta"

export interface ValidationSpecification<T, P> {
  validator?: Validator<T, P>
}

export interface ValidationState {
  visited?: boolean
  error?: ValidationResult // An error message string or true for an unspecified error,
  allErrors?: Array<Meta<any>>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends ValidationSpecification<T, P> {}

    interface State<T, P> extends ValidationState {
      this?: State<T, P>
    }
  }
}

/**
 * A validator function checks for field errors.
 * Returns either a string value containing an error message
 * (or a terminology key for multi-lingual support),
 * a boolean value of `true` indicating valid or `false` indicating an error without a message.
 * Note that a boolean result from a Validator is reversed for the value of `error` on the state properties.
 * i.e. a Validator result of `false` (no error) produces a `props.error` value of `true`.
 * This allows for validation functions of the format `condition === expected || message`.
 */
export type Validator<T, P = any> = (meta: Meta<T, P>) => ValidationResult
export type ValidationResult = string | boolean

/**
 * A constraint takes any type of configuration parameter(s) and returns a validator function.
 */
export type Constraint<T, P = any> = (...params: any[]) => Validator<T, P>

initMetaState(() => ({
  error: false, // Error state is NOT initialised to match the current value, to enable initially invalid unentered fields
  visited: false
}))

/**
 * Validate any field or object state.
 */
export function validate (meta: Meta<any>) {
  const validator = meta.$.spec.validator
  if (typeof validator === "function") {
    const result = meta.$.state.error = validator(meta)
    if (result === false) {
      meta.$.state.error = true
    } else if (typeof result === "string") {
      meta.$.state.error = result
    } else {
      meta.$.state.error = false
    }
  }
  return meta.$.state.error
}

/**
 * Validate the entire object recursively.
 * Returns an array of the SuperStates that are in an error state,
 * from which a cumulative error presentation may be constructed.
 */
export function validateAll<T extends {}> (meta: Meta<T>) {
  const result: Array<Meta<any>> = []
  const error = validate(meta)
  if (error) result.push(meta)
  const keys = fieldKeys(meta.$.spec)
  for (const key of keys) {
    const childErrors = validateAll(meta[key])
    result.splice(result.length, 0, ...childErrors)
  }
  meta.$.state.allErrors = result
  return result
}
