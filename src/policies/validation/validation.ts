import { fieldKeys, Meta, MetaArray, metaCall, MetaFn, metaSetups } from "../../meta"
import { Policy } from "../../policy"
import { labelOrKey } from "../terminology/terminology"

export interface ValidationSpec<T, P = any> {
  validator?: Validator<T, P>
  mandatory?: boolean | MetaFn<T, P, boolean>
  disabled?: boolean | MetaFn<T, P, boolean>
  hidden?: boolean | MetaFn<T, P, boolean>
}

export interface ValidationState {
  validated?: boolean // Indicates that this field has been visited for validation
  error?: ValidationResult // An error message string or true for an unspecified error,
  allErrors?: Array<Meta<any>>
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
 * Note that a boolean result from a Validator is reversed for the value of `error` on the state properties.
 * i.e. a Validator result of `false` (no error) produces a `props.error` value of `true`.
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

metaSetups.push(<T>(meta: Meta<T>) => {
  const state: Policy.State<T> = meta.$.spec.validator
    ? { error: false, validated: false } // Error state is NOT initialised to match the current value, to enable initially invalid unentered fields
    : {}

  const addDynamic = (meta: Meta<T>, name: string, getter: MetaFn<T>) => {
    Object.defineProperty(meta.$.state, name, {
      enumerable: true,
      get () {
        return getter(meta.$.value, meta)
      }
    })
  }

  const hiddenSpec = meta.$.spec.hidden
  if (typeof hiddenSpec === "function") {
    addDynamic(meta, "hidden", hiddenSpec)
  } else if (typeof hiddenSpec === "boolean") {
    state.hidden = hiddenSpec
  }

  const disabledSpec = meta.$.spec.disabled
  if (typeof disabledSpec === "function") {
    addDynamic(meta, "disabled", disabledSpec)
  } else if (typeof disabledSpec === "boolean") {
    state.disabled = disabledSpec
  }

  const mandatorySpec = meta.$.spec.mandatory
  if (typeof mandatorySpec === "function") {
    addDynamic(meta, "mandatory", mandatorySpec)
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
let requiredLabelFn: MetaFn<any, any, string> = (value, meta) =>
  `${(meta ? labelOrKey(meta) : false) || "This field"} is required`

/**
 * Run the validation for the individual meta provided.
 * Sets the `validated` state to true and the `error` state according to the validation result.
 * Note: This is not recursive - use `validateAll` for that purpose.
 */
export function validate (meta: Meta<any>) {
  meta.$.state.validated = true
  delete meta.$.state.error
  if (meta.$.state.hidden) return
  if (meta.$.state.mandatory && !hasValue(meta)) {
    meta.$.state.error = metaCall(requiredLabelFn)(meta)
  } else {
    const validator = meta.$.spec.validator
    if (typeof validator === "function") {
      const result = metaCall(validator)(meta)
      if (result === false) {
        meta.$.state.error = true
      } else if (typeof result === "string") {
        meta.$.state.error = result
      } else {
        meta.$.state.error = false
      }
    }
  }
}

export function hasValue (meta: Meta<any>) {
  const value = meta.$.value
  return !(value === "" || (value ?? null) === null)
}

/**
 * Validate the entire object recursively.
 * Returns an array of the Metas that are in an error state,
 * from which a cumulative error presentation may be constructed.
 * If revalidate parameter is set to true, only previously validated items are validated
 */
export function validateAll<T extends {}> (meta: Meta<T>, revalidate: boolean = false) {
  const result: Array<Meta<any>> = []
  if (!revalidate || meta.$.state.validated) validate(meta)
  if (meta.$.state.error) result.push(meta)
  const keys = fieldKeys(meta.$.spec)
  for (const key of keys) {
    const sub = meta[key]
    let childErrors: Array<Meta<any>> = []
    if (Array.isArray(sub)) {
      const subArr = sub as MetaArray<any>
      childErrors = subArr.flatMap(child => validateAll(child, revalidate))
    } else {
      const subMeta = sub as Meta<any>
      if (!subMeta.$.state.hidden) {
        childErrors = validateAll(subMeta, revalidate)
      }
    }
    result.splice(result.length, 0, ...childErrors)
  }
  meta.$.state.allErrors = result
  return result
}
