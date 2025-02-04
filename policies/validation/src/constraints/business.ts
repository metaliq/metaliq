import { allOf, matchRegex, transform } from "./foundation"
import { Validator } from "../validation"

/** Emails **/

// eslint-disable-next-line no-control-regex
const emailEx = /(?:[a-z0-9A-Z!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9A-Z!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])/
export const isEmail = (): Validator<string> => $ =>
  !$.value || !!$.value?.match(emailEx) || "Not a valid email address"

/** Phone numbers **/

// TODO: Provide better internationalisation.
// Developed to check Australian phone number format, with option to change or exclude country code.
export const isPhoneNumber = (countryCode: string = "61"): Validator<string> => $ => {
  const phone = $.value
  if (!phone) return true // Specify whether field is mandatory separately
  const countryCodeEx = new RegExp(`^\\+${countryCode}`)
  if (countryCode && !phone.match(countryCodeEx)) {
    if (phone.match(/^0/)) {
      $.value = (`+${countryCode}${phone.substr(1)}`)
    } else {
      return "Missing country code"
    }
  }
  const rest = phone.substr(3).trim().replace(/ /g, "")
  if (!rest.match(/^\d*$/)) { // All digits
    return "Should only contain numbers and spaces"
  }
  if (rest.match(/^0/)) {
    return "Should not include initial zero after country code"
  }
  if (rest.length > 9) {
    return "Too many digits"
  }
  if (rest.length < 9) {
    return "Too few digits"
  }
  if (rest.match(/^4/)) { // Mobile number
    $.value = `+${countryCode} ${rest.substr(0, 3)} ${rest.substr(3, 3)} ${rest.substr(6)}`
  } else { // Land line
    $.value = `+${countryCode} ${rest.substr(0, 1)} ${rest.substr(1, 4)} ${rest.substr(5)}`
  }
  return true // No error, potentially reformatted
}

export const isBsb = (msg?: string): Validator<string> => allOf(
  matchRegex(/^\d\d\d.?\d\d\d$/, msg || "Not a valid BSB"),
  transform($ => $.value.replace(/[^\d]/gmi, ""))
)
