import { MetaView } from "./presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import flatpickr from "flatpickr"
import { up } from "@metaliq/up"
import { DateLimit } from "flatpickr/dist/types/options"
import { validate } from "../validation/validation"
import { fieldError, isDisabled } from "./widgets"
import { label } from "../terminology/terminology"
import { $nf } from "../../meta"

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

export const datePicker = (options: DatePickerOptions = {}): MetaView<string> => ({ value, meta }) => {
  const disabled = $nf(isDisabled)(meta)
  return html`
    <label class="mq-field mq-text-field ${classMap({
      [options.classes]: !!options.classes,
      "mq-mandatory": meta.$.state.mandatory,
      "mq-active": meta.$.state.active,
      "mq-populated": !!value
    })}">
      <span class="mq-input-label">
        ${label(meta)}
      </span>
      ${guard([meta, disabled], () => {
        const id = `mq-datepicker-${Math.ceil(Math.random() * 1000000)}`
        setTimeout(
          () => {
            flatpickr(`#${id}`, {
              onClose (selectedDates, dateStr) {
                if (selectedDates[0]) {
                  value = flatpickr.formatDate(selectedDates[0], options.valueFormat || "Y-m-d")
                  meta.$.value = value
                  up(validate, meta)()
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
      ${fieldError(meta.$)}
    </label>
  `
}

export const formatDate = flatpickr.formatDate
export const parseDate = flatpickr.parseDate
