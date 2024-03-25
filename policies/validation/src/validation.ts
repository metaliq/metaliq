import { isMeta, meta$, Meta$, MetaFn, metaSetups } from "metaliq"
import { labelOrKey } from "@metaliq/terminology"
import { appendTo } from "@metaliq/util"

/**
 * Noop function to force policy registration.
 */
export const VALIDATION = () => {}

export interface ValidationTerms<T, P = any> {
  validator?: Validator<T, P>
  mandatory?: boolean | MetaFn<T, P, boolean>
  disabled?: boolean | MetaFn<T, P, boolean>
  hidden?: boolean | MetaFn<T, P, boolean>
}

export interface ValidationState {
  validated?: boolean // Indicates that this field has been visited for validation
  error?: ValidationResult // An error message string or true for an unspecified error,
  allErrors?: Array<Meta$<any>>
  active?: boolean
  showing?: boolean // Support animated hide/show
}

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends ValidationTerms<T, P> {
    }

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
 * This allows for validation functions of the form `condition === expected || message`.
 * Note also that if a validator function does not return a value
 * (i.e. return is undefined), no error is reported.
 */
export type Validator<T, P = any> = MetaFn<T, P, ValidationResult>
export type ValidationResult = string | boolean

/**
 * A constraint takes any type of configuration parameter(s) and returns a validator function.
 */
export type Constraint<T, P = any> = (...params: any[]) => Validator<T, P>

metaSetups.push(<T>($: Meta$<T>) => {
  if ($.model.validator) {
    $.state.error = false
    $.state.validated = false
  }
})

/**
 * Establish a function for mandatory field errors.
 * See src for a basic example of an English language error.
 */
export function setRequiredLabel (fn: MetaFn<any, any, string>) {
  requiredLabelFn = fn
}
let requiredLabelFn: MetaFn<any, any, string> = (v, $ = meta$(v)) =>
  `${labelOrKey($) || "This field"} is required`

/**
 * Run the validation for the individual object provided.
 * Can send either the $ meta info (recommended),
 * or its associated data value (not a primitive).
 * Sets the `validated` state to true and the `error` state according to the validation result.
 * Note that a boolean result from a Validator is reversed for the value of `error` on the state properties.
 * i.e. a Validator result of `false` (no error) produces a `props.error` value of `true`.
 *
 * Returns the validation result.
 *
 * Note: This is not recursive - use `validateAll` for that purpose.
 */
export const validate = <T, P> (v$: T | Meta$<T, P>): ValidationResult => {
  const $ = (meta$(v$) || v$) as Meta$<T, P>
  $.state.validated = true
  delete $.state.error
  if ($.term("hidden")) return
  if ($.term("mandatory") && !hasValue($)) {
    return ($.state.error = requiredLabelFn($.value, $))
  } else {
    const validator = $.model.validator
    if (typeof validator === "function") {
      const result = validator($.value, $)
      if (result === false) {
        $.state.error = true
      } else if (typeof result === "string") {
        $.state.error = result
      } else {
        $.state.error = false
      }
      return result
    }
  }
}

/**
 * Indicates whether the field has a value from a validation perspective.
 * Can accept either a value (including a primitive) or its meta info $ object.
 */
export const hasValue = <T, P> (v$: T | Meta$<T, P>) => {
  const value: any = typeof (v$ ?? false) === "object" ? (<Meta$<T, P>>(meta$(v$) || v$)).value : v$
  return !(
    value === "" ||
    (Array.isArray(value) && !value.length) ||
    (value ?? null) === null
  )
}

/**
 * Validate the entire object recursively.
 * Can send either the $ meta info (recommended),
 * or its associated data value (not a primitive).
 * Returns an array of the Meta$s that are in an error state,
 * from which a cumulative error presentation may be constructed.
 */
export const validateAll = <T, P>(v$: T | Meta$<T, P>) => {
  const $ = (meta$(v$) || v$) as Meta$<T, P>
  const result: Array<Meta$<any>> = []
  if (!$.term("hidden")) {
    validate($)
    if ($.state.error) result.push($)
    const { meta } = $
    if (Array.isArray(meta)) {
      for (const sub of meta) {
        appendTo(result, validateAll(sub.$))
      }
    } else if (isMeta(meta)) {
      for (const key of $.fieldKeys()) {
        const sub = meta[key]
        appendTo(result, validateAll(sub.$ as Meta$<any>))
      }
    }
  }
  $.state.allErrors = result
  return result
}

export const unvalidate = <T, P>(v$: T | Meta$<T, P>) => {
  const $ = (meta$(v$) || v$) as Meta$<T, P>
  delete $.state.error
  const { meta } = $
  if (Array.isArray(meta)) {
    for (const sub of meta) {
      unvalidate(sub.$)
    }
  } else if (isMeta(meta)) {
    for (const key of $.fieldKeys()) {
      const sub = meta[key]
      unvalidate(sub)
    }
  }
}
