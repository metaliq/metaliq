import * as ChoicesModule from "choices.js"
import { MetaView } from "./presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import { up } from "@metaliq/up"
import { Meta } from "../../meta"
import { validate } from "../validation/validation"
import { fieldError } from "./widgets"
import { label } from "../terminology/terminology"
import { getModuleDefault } from "../../util/import"

export type SelectorOptions = {
  classes?: string
  type?: "text" | "select-one" | "select-multiple"
  choices?: ChoicesModule.Choice[]
  searchText?: string
}

const Choices = <any>getModuleDefault(ChoicesModule, "Choices") as typeof ChoicesModule.default

export const selector = (options: SelectorOptions = {}): MetaView<any> => (value, meta) => html`
  <label class="mq-field mq-select-field ${classMap({
    [options.classes]: !!options.classes,
    "mq-populated": !!value
  })}">
    ${guard([meta], () => {
      const id = `mq-selector-${Math.ceil(Math.random() * 1000000)}`
      if (value) {
        const selected = options.choices.find(c => c.value === value)
        if (!selected) {
          console.warn(`Invalid selector value for ${meta.$.key} : ${value}`)
        } else {
          selected.selected = true
        }
      }
      setTimeout(
        () => {
          // eslint-disable-next-line no-new -- No need to hold reference to Choices
          new Choices(`#${id}`, {
            choices: options.choices,
            searchPlaceholderValue: options.searchText ?? ""
          })
        },
        250
      )
      return html`
        <select class="mq-input " id=${id} @change=${up(onSelect, meta)}>
          <option value="">${label(meta)}</option>
        </select>
      `
    })}
    ${fieldError(value, meta)}
  </label>
`

export const objectChoices = (object: object, keyAsLabel: boolean = false) => [
  ...Object.entries(object).map(([k, v]) => ({
    value: k,
    label: keyAsLabel ? k : v
  }))
]

export const stringChoices = (strings: string[]) => strings.map(s => ({ value: s, label: s }))

function onSelect (meta: Meta<any>, event: { detail: { value: string } }) {
  meta.$.value = event.detail.value
  validate(meta)
}
