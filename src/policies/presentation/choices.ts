import * as ChoicesModule from "choices.js"
import { MetaView } from "./presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import { up } from "@metaliq/up"
import { Meta } from "../../meta"
import { validate } from "../validation/validation"
import { fieldError, isDisabled } from "./widgets"
import { label } from "../terminology/terminology"
import { getModuleDefault } from "../../util/import"
import { remove } from "../../util/util"

export type SelectorOptions = {
  classes?: string
  type?: "text" | "select-one" | "select-multiple"
  choices?: ChoicesModule.Choice[]
  searchText?: string
  multiple?: boolean
}

const Choices = <any>getModuleDefault(ChoicesModule, "Choices") as typeof ChoicesModule.default

export const selector = (options: SelectorOptions = {}): MetaView<any> => (value, meta) => {
  const disabled = isDisabled(meta)
  return html`
    <label class="mq-field mq-select-field ${classMap({
      [options.classes]: !!options.classes,
      "mq-populated": !!value
    })}">
      ${guard([meta], () => {
        let choices: any
        const id = `mq-selector-${Math.ceil(Math.random() * 1000000)}`
        if (value) {
          const values = Array.isArray(value) ? value : [value]
          for (const val of values) {
            const selected = options.choices.find(c => c.value === val)
            if (!selected) {
              console.warn(`Invalid selector value for ${meta.$.key} : ${value}`)
            } else {
              selected.selected = true
            }
          }
        }
        setTimeout(
          () => {
            // eslint-disable-next-line no-new -- No need to hold reference to Choices
            choices = new Choices(`#${id}`, {
              choices: options.choices,
              searchPlaceholderValue: options.searchText ?? "",
              allowHTML: true,
              removeItems: true,
              removeItemButton: true,
              callbackOnInit: () => {
                console.log("Initialised choices", this)
              }
            })
          },
          250
        )

        return html`
            <select id=${id} 
              @addItem=${up(onAddItem(options), meta)}
              @removeItem=${up(onRemoveItem(options), meta)}
              ?multiple=${options.multiple}
              ?disabled=${disabled}
              class="mq-input ${classMap({ "mq-disabled": disabled })}"
            >
              ${options.multiple ? "" : html`
                <option value="">${label(meta)}</option>
              `}
            </select>
          `
      })}
      ${fieldError(value, meta)}
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

const onChange = (options: SelectorOptions) => (meta: Meta<any>, event: { detail: { value: string } }) => {
  console.log(event)
}

const onAddItem = (options: SelectorOptions) => (meta: Meta<any>, event: { detail: { value: string } }) => {
  if (options.multiple) {
    meta.$.value = meta.$.value || []
    meta.$.value.push(event.detail.value)
  } else {
    meta.$.value = event.detail.value
  }
  validate(meta)
}

const onRemoveItem = (options: SelectorOptions) => (meta: Meta<any>, event: { detail: { value: string } }) => {
  if (options.multiple) {
    remove(meta.$.value, event.detail.value)
  } else {
    meta.$.value = ""
  }
}
