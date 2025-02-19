import { getViewState, MetaView, setViewState } from "@metaliq/presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import flatpickr from "flatpickr"
import { up } from "@metaliq/up"
import { DateLimit } from "flatpickr/dist/types/options"
import { hasValue, validate } from "@metaliq/validation"
import { fieldContainer, FieldOptions, isDisabled } from "@metaliq/forms"
import { Meta$ } from "metaliq"
import { TERMINOLOGY } from "@metaliq/terminology"
import Instance = flatpickr.Instance
import FPOptions = flatpickr.Options.Options

TERMINOLOGY()

export type DatePickerOptions = FieldOptions<any> & {
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

  /**
   * Native FlatPickr Options
   */
  fpOptions?: FPOptions
}

// Instance name for storing in meta-state
// Prefixed with `$_` to avoid partial serialisation
const FLATPICKR_INSTANCE = "$_flatpickr-instance"

const innerDatePicker = (options: DatePickerOptions = {}): MetaView<string> => $ => {
  let value = $.value
  const disabled = isDisabled($)
  const fl = getViewState(FLATPICKR_INSTANCE)($) as Instance

  if (fl) {
    if ($.value && new Date(fl.selectedDates[0]) !== new Date($.value)) {
      fl.setDate(new Date($.value))
    } else if (!$.value) {
      fl.clear()
    }
  }

  const clearDate = ($: Meta$<string>) => {
    $.value = ""
    fl.clear()
  }

  return [
    html`${guard([$, disabled], () => {
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
            disableMobile: true,
            locale: {
              // Default to start week on Monday, can be overriden in fpOptions
              firstDayOfWeek: 1
            },
            ...options.fpOptions
          }) as Instance
          setViewState(FLATPICKR_INSTANCE, !Array.isArray(fl) && fl)($)
        }
      )
      return html`
        <input id=${id}
          ?disabled=${disabled}
          class="mq-input ${classMap({ "mq-disabled": disabled })}"
          @focus=${up(() => { $.state.active = true })}
          @blur=${up(() => { $.state.active = false })}
        />
      `
    })}`,
    hasValue($) && !disabled ? html`
      <button class="mq-field-clear" @click=${up(clearDate, $)} tabindex="-1"></button>
    ` : ""
  ]
}

export const datePicker = (options: DatePickerOptions = {}): MetaView<string> =>
  fieldContainer({ type: "date", ...options })(innerDatePicker(options))

export const formatDate = flatpickr.formatDate
export const parseDate = flatpickr.parseDate
