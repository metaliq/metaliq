import * as ChoicesModule from "choices.js"
import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import { up } from "@metaliq/up"
import { Meta$ } from "metaliq"
import { fieldClasses, fieldError, fieldLabel, isDisabled } from "@metaliq/forms"
import { getModuleDefault } from "@metaliq/util/lib/import"
import { remove } from "@metaliq/util"
import { hasValue, validate } from "@metaliq/validation"

export type SelectorOptions = {
  classes?: string
  type?: "text" | "select-one" | "select-multiple"
  choices?: ChoicesModule.Choice[]
  searchText?: string
  multiple?: boolean
  sort?: boolean // Defaults to true, set to false to prevent alpha-sorting
}

const Choices = <any>getModuleDefault(ChoicesModule, "Choices") as typeof ChoicesModule.default

export const selector = (options: SelectorOptions = {}): MetaView<any> => (v, $) => {
  options = {
    sort: true,
    ...options
  }
  const disabled = isDisabled($)
  return html`
    <label class="mq-field mq-select-field ${classMap({
      [options.classes]: !!options.classes,
      ...fieldClasses($),
      "mq-populated": hasValue($)
    })}">
      ${guard($, () => {
        const id = `mq-selector-${Math.ceil(Math.random() * 1000000)}`
        options.choices.forEach(choice => { delete choice.selected })
        if (hasValue($)) {
          const values = Array.isArray(v) ? v : [v]
          for (const val of values) {
            const selected = options.choices.find(c => c.value === val)
            if (!selected) {
              console.warn(`Invalid selector value for ${$.key} : ${v}`)
            } else {
              selected.selected = true
            }
          }
        }
        setTimeout(
          () => {
            // eslint-disable-next-line no-new -- No need to hold reference to Choices
            new Choices(`#${id}`, {
              searchPlaceholderValue: options.searchText ?? "",
              allowHTML: true,
              removeItems: true,
              removeItemButton: true,
              shouldSort: !!options.sort,
              callbackOnInit: function () {
                // Initialise choices here instead of in options to prevent problem with non-sorted list "selecting" placeholder.
                const choicesJs = <unknown> this as { setChoices: (p: any[]) => void }
                choicesJs.setChoices(options.choices)
              }
            })
          },
          250
        )

        return html`
            <select id=${id}
              @change=${up(onChange(options), $)}
              @addItem=${up(onAddItem(options), $)}
              @removeItem=${up(onRemoveItem(options), $)}
              ?multiple=${options.multiple}
              ?disabled=${disabled}
              class="mq-input ${classMap({ "mq-disabled": disabled })}"
            >
              ${options.multiple ? "" : html`
                <option value="">${$.state.label}</option>
              `}
            </select>
          `
      })}
      ${fieldLabel()(v, $)}
      ${fieldError(v, $)}
    </label>
`
}

export const objectChoices = (object: object, keyAsLabel: boolean = false) => [
  ...Object.entries(object).map(([k, v]) => ({
    value: k,
    label: keyAsLabel ? k : v
  }))
]

export const stringChoices = (strings: string[]) => strings.map(s => ({ value: s, label: s }))

type ProposedChange = {
  type: "Add" | "Remove"
  value: string
}

const state = {
  proposedChange: null as ProposedChange
}

const onChange = (options: SelectorOptions) => ($: Meta$<any>, event: Event) => {
  if (state.proposedChange?.type === "Add") {
    if (options.multiple) {
      $.value = $.value || ($.parent.$.value[$.key] = [])
      $.value.push(state.proposedChange.value)
    } else {
      $.value = state.proposedChange.value
    }
  } else if (state.proposedChange?.type === "Remove") {
    if (options.multiple) {
      remove($.value, state.proposedChange.value)
    } else {
      $.value = ""
    }
  }
  validate($)
  state.proposedChange = null
}

const onAddItem = (options: SelectorOptions) => ($: Meta$<any>, event: { detail: { value: string } }) => {
  state.proposedChange = {
    type: "Add",
    value: event?.detail?.value
  }
}

const onRemoveItem = (options: SelectorOptions) => ($: Meta$<any>, event: { detail: { value: string } }) => {
  state.proposedChange = {
    type: "Remove",
    value: event?.detail?.value
  }
}
