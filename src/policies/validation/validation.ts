import { fieldKeys, isMeta, isMetaArray, m$, Meta$, MetaFn, metaSetups } from "../../meta"
import { Policy } from "../../policy"
import { labelOrKey } from "../terminology/terminology"
import { appendTo } from "../../util/util"

export interface ValidationSpec<T, P = any> {
  validator?: Validator<T, P>
  mandatory?: boolean | MetaFn<T, P, boolean>
  disabled?: boolean | MetaFn<T, P, boolean>
  hidden?: boolean | MetaFn<T, P, boolean>
}

export interface ValidationState {
  validated?: boolean // Indicates that this field has been visited for validation
  error?: ValidationResult // An error message string or true for an unspecified error,
  allErrors?: Array<Meta$<any>>
  mandatory?: boolean
  disabled?: boolean
  hidden?: boolean
  active?: boolean
  showing?: boolean // Support animated hide/show
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends ValidationSpec<T, P> {
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
  const state: Policy.State<T> = $.spec.validator
    ? { error: false, validated: false } // Error state is NOT initialised to match the current value, to enable initially invalid unentered fields
    : {}

  const addDynamic = ($: Meta$<T>, name: string, getter: MetaFn<T>) => {
    Object.defineProperty($.state, name, {
      enumerable: true,
      get () {
        return getter($.value, $)
      }
    })
  }

  const hiddenSpec = $.spec.hidden
  if (typeof hiddenSpec === "function") {
    addDynamic($, "hidden", hiddenSpec)
  } else if (typeof hiddenSpec === "boolean") {
    state.hidden = hiddenSpec
  }

  const disabledSpec = $.spec.disabled
  if (typeof disabledSpec === "function") {
    addDynamic($, "disabled", disabledSpec)
  } else if (typeof disabledSpec === "boolean") {
    state.disabled = disabledSpec
  }

  const mandatorySpec = $.spec.mandatory
  if (typeof mandatorySpec === "function") {
    addDynamic($, "mandatory", mandatorySpec)
  } else if (typeof mandatorySpec === "boolean") {
    state.mandatory = mandatorySpec
  }

  return state
})

/**
 * Establish a function for mandatory field errors.
 * See src for a basic example of an English language error.
 */
export function setRequiredLabel (fn: MetaFn<any, any, string>) {
  requiredLabelFn = fn
}
let requiredLabelFn: MetaFn<any, any, string> = (v, $ = m$(v)) =>
  `${labelOrKey(v, $) || "This field"} is required`

/**
 * Run the validation for the individual meta provided.
 * Sets the `validated` state to true and the `error` state according to the validation result.
 * Note that a boolean result from a Validator is reversed for the value of `error` on the state properties.
 * i.e. a Validator result of `false` (no error) produces a `props.error` value of `true`.
 *
 * Returns the validation result.
 *
 * Note: This is not recursive - use `validateAll` for that purpose.
 */
export const validate: MetaFn<any, any, ValidationResult> = (v, $ = m$(v)) => {
  $.state.validated = true
  delete $.state.error
  if ($.state.hidden) return
  if ($.state.mandatory && !hasValue($.value, $)) {
    return ($.state.error = requiredLabelFn(v, $))
  } else {
    const validator = $.spec.validator
    if (typeof validator === "function") {
      const result = validator(v, $)
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

export const hasValue: MetaFn<any> = (v, $) => {
  $ = $ || m$(v)
  return !(
    v === "" ||
    (Array.isArray(v) && !v.length) ||
    (v ?? null) === null
  )
}

/**
 * Validate the entire object recursively.
 * Returns an array of the Meta$s that are in an error state,
 * from which a cumulative error presentation may be constructed.
 */
export const validateAll: MetaFn<any> = (v, $ = m$(v)) => {
  const result: Array<Meta$<any>> = []
  if (!$.state.hidden) {
    validate(v, $)
    if ($.state.error) result.push($)
    const { meta } = $
    if (isMetaArray(meta)) {
      for (const sub of meta) {
        appendTo(result, validateAll(sub.$.value))
      }
    } else if (isMeta(meta)) {
      const keys = fieldKeys($.spec)
      for (const key of keys) {
        const sub = meta[key]
        appendTo(result, validateAll(sub.$.value))
      }
    }
  }
  $.state.allErrors = result
  return result
}
