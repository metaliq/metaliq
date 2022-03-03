import { MetaView } from "./presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import flatpickr from "flatpickr"
import { up } from "@metaliq/up"
import { DateLimit } from "flatpickr/dist/types/options"
import { validate } from "../validation/validation"
import { fieldError } from "./widgets"

export type DatePickerOptions = {
  caption?: string
  classes?: string
  labelTrigger?: boolean
  disable?: DateLimit[]
  dateFormat?: string
}

export const datePicker = (options: DatePickerOptions = {}): MetaView<string> => meta => html`
  <label class="mq-field mq-text-field ${classMap({
    [options.classes]: !!options.classes,
    "mq-mandatory": meta.$.state.mandatory,
    "mq-active": meta.$.state.active,
    "mq-populated": !!meta.$.value
  })}">
    <span class="mq-input-label">
      ${options.caption ?? meta.$.spec.label}
    </span>
    ${guard([meta], () => {
      const id = `mq-datepicker-${Math.ceil(Math.random() * 1000000)}`
      setTimeout(
        () => {
          flatpickr(`#${id}`, {
            onClose (selectedDates, dateStr) {
              meta.$.value = dateStr
              meta.$.parent.$.value[meta.$.key] = dateStr
              up(validate, meta)()
            },
            defaultDate: meta.$.value || "",
            disable: options.disable || [],
            dateFormat: options.dateFormat || "Y-m-d",
            disableMobile: true
          })
        },
        250
      )
      return html`
        <input class="mq-input ${options.classes ?? ""}" id=${id} />
      `
    })}
    ${fieldError(meta)}
  </label>
`
