// Some sample constraints
import { Constraint, Validator } from "./validation"

export const blankOr = (other: Validator<string>): Validator<string> => (meta) =>
  !meta.$.value || other(meta)

export const minLength: Constraint<string> = (min: number) => (meta) =>
  meta.$.value?.length >= min || `Should be at least ${min} characters`

export const hasLength: Constraint<string> = (length: number) => (meta) =>
  meta.$.value?.length === length || `Should be exactly ${length} characters`

export const min: Constraint<number> = (minVal: number) => (meta) =>
  meta.$.value >= minVal || "Too low"

// eslint-disable-next-line no-control-regex
const emailEx = /(?:[a-z0-9A-Z!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9A-Z!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])/
export const isEmail: Constraint<string> = () => (meta) =>
  !!meta.$.value?.match(emailEx) || "Not a valid email address"
