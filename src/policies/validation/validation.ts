import { fieldKeys, specValue, Meta, MetaArray, MetaProc, metaSetups, m$ } from "../../meta"

export interface ValidationSpec<T, P> {
  validator?: Validator<T, P>
  mandatory?: boolean | MetaProc<T, P, boolean>
  disabled?: boolean | MetaProc<T, P, boolean>
  hidden?: boolean | MetaProc<T, P, boolean>
}

export interface ValidationState {
  validated?: boolean // Indicates that this field has been visited for validation
  error?: ValidationResult // An error message string or true for an unspecified error,
  allErrors?: Array<Meta<any>>
  mandatory?: boolean
  disabled?: boolean
  hidden?: boolean
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends ValidationSpec<T, P> {}

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
 */
export type Validator<T, P = any> = (meta: Meta<T, P>) => ValidationResult
export type ValidationResult = string | boolean

/**
 * A constraint takes any type of configuration parameter(s) and returns a validator function.
 */
export type Constraint<T, P = any> = (...params: any[]) => Validator<T, P>

metaSetups.push(meta => {
  if (meta.$.spec.validator) {
    return {
      error: false, // Error state is NOT initialised to match the current value, to enable initially invalid unentered fields
      validated: false,
      // TODO: Update these potentially conditional values from the spec as appropriate, and apply them in validation
      mandatory: specValue(meta, "mandatory"),
      disabled: specValue(meta, "disabled"),
      hidden: specValue(meta, "hidden")
    }
  }
})

/**
 * Run the validation for the individual meta provided.
 * Sets the `validated` state to true and the `error` state according to the validation result.
 * Note: This is not recursive - use `validateAll` for that purpose.
 */
export function validate (meta: Meta<any>) {
  meta.$.state.validated = true
  const validator = meta.$.spec.validator
  if (typeof validator === "function") {
    const result = validator(meta)
    if (result === false) {
      meta.$.state.error = true
    } else if (typeof result === "string") {
      meta.$.state.error = result
    } else {
      meta.$.state.error = false
    }
  }
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
    let childErrors: Array<Meta<any>>
    if (Array.isArray(sub)) {
      const subArr = sub as MetaArray<any>
      childErrors = subArr.flatMap(child => validateAll(child, revalidate))
    } else {
      const subMeta = sub as Meta<any>
      childErrors = validateAll(subMeta, revalidate)
    }
    result.splice(result.length, 0, ...childErrors)
  }
  meta.$.state.allErrors = result
  return result
}

export function validateValue (value: any) {
  validate(m$(value).meta)
}

export function validateAllValues (value: any, revalidate: boolean = false) {
  return validateAll(m$(value).meta)
}
