import { MetaView } from "./presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import flatpickr from "flatpickr"
import { up } from "@metaliq/up"
import { DateLimit } from "flatpickr/dist/types/options"
import { validate } from "../validation/validation"
import { fieldError, isDisabled } from "./widgets"

export type DatePickerOptions = {
  classes?: string
  labelTrigger?: boolean
  disable?: DateLimit[]

  /**
   * Display format for input field, using flatpickr formatting as per https://flatpickr.js.org/formatting/
   */
  displayFormat?: string

  /**
   * Value storage format, using flatpickr formatting as per https://flatpickr.js.org/formatting/
   */
  valueFormat?: string
}

export const datePicker = (options: DatePickerOptions = {}): MetaView<string> => (value, $) => {
  const disabled = isDisabled($)
  return html`
    <label class="mq-field mq-text-field ${classMap({
      [options.classes]: !!options.classes,
      "mq-mandatory": $.state.mandatory,
      "mq-active": $.state.active,
      "mq-populated": !!value
    })}">
      <span class="mq-input-label">
        ${$.state.label}
      </span>
      ${guard([$, disabled], () => {
        const id = `mq-datepicker-${Math.ceil(Math.random() * 1000000)}`
        setTimeout(
          () => {
            flatpickr(`#${id}`, {
              onClose (selectedDates, dateStr) {
                if (selectedDates[0]) {
                  value = flatpickr.formatDate(selectedDates[0], options.valueFormat || "Y-m-d")
                  $.value = value
                  up(validate, $)()
                }
              },
              defaultDate: flatpickr.parseDate(value || "", options.valueFormat),
              disable: options.disable || [],
              dateFormat: options.displayFormat || "Y-m-d",
              disableMobile: true
            })
          },
          250
        )
        return html`
          <input id=${id}
            ?disabled=${disabled}
            class="mq-input ${classMap({ "mq-disabled": disabled })}" 
          />
        `
      })}
      ${fieldError(value, $)}
    </label>
  `
}

export const formatDate = flatpickr.formatDate
export const parseDate = flatpickr.parseDate
