import * as ChoicesModule from "choices.js"
import { MetaView } from "./presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import { addScript } from "./3pjs"
import { up } from "@metaliq/up"
import { Meta } from "../../meta"
import { validate } from "../validation/validation"
import { fieldError } from "./widgets"

addScript("https://cdn.jsdelivr.net/npm/choices.js@10.0.0/public/assets/scripts/choices.min.js")

export type SelectorOptions = {
  classes?: string
  type?: "text" | "select-one" | "select-multiple"
  choices?: ChoicesModule.Choice[]
  searchText?: string
}

declare global {
  interface Window {
    Choices: typeof ChoicesModule
  }
}

export const selector = (options: SelectorOptions = {}): MetaView<any> => meta => html`
  <label class="mq-field mq-select-field ${classMap({
    [options.classes]: !!options.classes,
    "mq-populated": !!meta.$.value
  })}">
    ${guard([meta], () => {
      const id = `mq-selector-${Math.ceil(Math.random() * 1000000)}`
      if (meta.$.value) {
        const selected = options.choices.find(c => c.value === meta.$.value)
        if (!selected) {
          console.warn(`Invalid selector value for ${meta.$.key} : ${meta.$.value}`)
        } else {
          selected.selected = true
        }
      }
      setTimeout(
        () => {
          // @ts-expect-error
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
          <option value="">${meta.$.spec.label}</option>
        </select>
      `
    })}
    ${fieldError(meta)}
  </label>
`

export const objectChoices = (object: object) => [
  ...Object.entries(object).map(([k, v]) => ({
    value: k,
    label: v
  }))
]

export const stringChoices = (strings: string[]) => strings.map(s => ({ value: s, label: s }))

function onSelect (meta: Meta<any>, event: { detail: { value: string } }) {
  meta.$.value = event.detail.value
  validate(meta)
}
