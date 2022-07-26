import * as ChoicesModule from "choices.js"
import { MetaView } from "./presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import { up } from "@metaliq/up"
import { Meta } from "../../meta"
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
  sort?: boolean // Defaults to true, set to false to prevent alpha-sorting
}

const Choices = <any>getModuleDefault(ChoicesModule, "Choices") as typeof ChoicesModule.default

export const selector = (options: SelectorOptions = {}): MetaView<any> => (value, meta) => {
  options = {
    sort: true,
    ...options
  }
  const disabled = isDisabled(meta)
  return html`
    <label class="mq-field mq-select-field ${classMap({
      [options.classes]: !!options.classes,
      "mq-populated": !!value
    })}">
      ${guard([meta], () => {
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
            new Choices(`#${id}`, {
              choices: options.choices,
              searchPlaceholderValue: options.searchText ?? "",
              allowHTML: true,
              removeItems: true,
              removeItemButton: true,
              shouldSort: !!options.sort,
              callbackOnInit: () => {
                console.log("Initialised choices", this)
              }
            })
          },
          250
        )

        return html`
            <select id=${id}
              @change=${up(onChange(options), meta)}
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

type ProposedChange = {
  type: "Add" | "Remove"
  value: string
}

const state = {
  proposedChange: null as ProposedChange
}

const onChange = (options: SelectorOptions) => (meta: Meta<any>, event: Event) => {
  if (state.proposedChange?.type === "Add") {
    if (options.multiple) {
      meta.$.value = meta.$.value || (meta.$.parent.$.value[meta.$.key] = [])
      meta.$.value.push(state.proposedChange.value)
    } else {
      meta.$.value = state.proposedChange.value
    }
  } else if (state.proposedChange?.type === "Remove") {
    if (options.multiple) {
      remove(meta.$.value, state.proposedChange.value)
    } else {
      meta.$.value = ""
    }
  }
  // validate(meta)
  state.proposedChange = null
}

const onAddItem = (options: SelectorOptions) => (meta: Meta<any>, event: { detail: { value: string } }) => {
  state.proposedChange = {
    type: "Add",
    value: event.detail.value
  }
}

const onRemoveItem = (options: SelectorOptions) => (meta: Meta<any>, event: { detail: { value: string } }) => {
  state.proposedChange = {
    type: "Remove",
    value: event.detail.value
  }
}
