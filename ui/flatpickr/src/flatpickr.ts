import { getViewState, MetaView, setViewState } from "@metaliq/presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import flatpickr from "flatpickr"
import { up } from "@metaliq/up"
import { DateLimit } from "flatpickr/dist/types/options"
import { hasValue, validate } from "@metaliq/validation"
import { fieldError, isDisabled } from "@metaliq/forms"
import { Meta$ } from "metaliq"
import Instance = flatpickr.Instance
import { TERMINOLOGY } from "@metaliq/terminology"

TERMINOLOGY()

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

const flatpickrInstance = "flatpickr-instance"

export const datePicker = (options: DatePickerOptions = {}): MetaView<string> => (value, $) => {
  const disabled = $.fn(isDisabled)

  const clearDate = ($: Meta$<string>) => {
    $.value = ""
    const fl = $.fn(getViewState(flatpickrInstance))
    fl.clear()
  }

  return html`
    <label class="mq-field mq-date-field ${classMap({
      [options.classes]: !!options.classes,
      "mq-mandatory": $.term("mandatory"),
      "mq-active": $.state.active,
      "mq-populated": !!value
    })}">
      <span class="mq-input-label">
        ${$.term("label")}
      </span>
      ${guard([$, disabled], () => {
        const id = `mq-datepicker-${Math.ceil(Math.random() * 1000000)}`

        setTimeout(
          () => {
            const fl = flatpickr(`#${id}`, {
              allowInput: true,
              onClose (selectedDates, dateStr) {
                if (selectedDates[0]) {
                  value = flatpickr.formatDate(selectedDates[0], options.valueFormat || "Y-m-d")
                  $.value = value
                  up(validate, $)().catch(e => { throw e })
                }
              },
              defaultDate: flatpickr.parseDate(value || "", options.valueFormat),
              disable: options.disable || [],
              dateFormat: options.displayFormat || "Y-m-d",
              disableMobile: true
            }) as Instance
            $.fn(setViewState(flatpickrInstance, fl))
          },
          250
        )
        return html`
          <input id=${id}
            ?disabled=${disabled}
            class="mq-input ${classMap({ "mq-disabled": disabled })}"
            @focus=${up(() => { $.state.active = true })}
            @blur=${up(() => { $.state.active = false })}
          />
        `
      })}
      ${hasValue($) && !disabled ? html`
        <button class="mq-field-clear" @click=${up(clearDate, $)} tabindex="-1"></button>
      ` : ""}
      ${fieldError(value, $)}
    </label>
  `
}

export const formatDate = flatpickr.formatDate
export const parseDate = flatpickr.parseDate
