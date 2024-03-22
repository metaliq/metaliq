import * as ChoicesModule from "choices.js"
import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import { up } from "@metaliq/up"
import { Meta$, MetaFn } from "metaliq"
import { fieldContainer, isDisabled, FieldOptions, fieldKey, fieldPath } from "@metaliq/forms"
import { getModuleDefault } from "@metaliq/util/lib/import"
import { equals, remove } from "@metaliq/util"
import { hasValue, validate } from "@metaliq/validation"
import { TERMINOLOGY } from "@metaliq/terminology"

TERMINOLOGY()

export { Choice } from "choices.js"

/**
 * Can't get proper type references from library due to incorrect ES definitions.
 * Mimic here.
 */
type ChoicesJs = {
  setChoices: (p: any[], v?: string, l?: string, r?: boolean) => void
  setChoiceByValue: (v: string) => void
  clearChoices: () => void
  clearStore: () => void
}

export type SelectorOptions<T, P = any> = FieldOptions<T, P> & {
  /**
   * Either a static array of choices or a function that returns choices.
   * This allows dynamic choices based on values elsewhere in the data graph.
   * If choices need to be dynamically updated on search key input, use
   * searchChoices instead. Using both together is not supported.
   */
  choices?: ChoicesModule.Choice[] | MetaFn<T, P, ChoicesModule.Choice[]>

  /**
   * A function (possibly asynchronous) that returns choices based on the
   * current value in the search input text.
   */
  searchFn?: SelectorSearchFn<P>

  /**
   * Text to display as a prompt in the search area.
   */
  searchText?: string

  /**
   * Allow selection of multiple items.
   */
  multiple?: boolean

  /**
   * Defaults to true, assign false to prevent alpha-sorting.
   */
  sort?: boolean
}

export type SelectorSearchFn<P> = (
  searchText: string, parent$: Meta$<P>
) => ChoicesModule.Choice[] | Promise<ChoicesModule.Choice[]>

interface SelectorState {
  choices?: ChoicesModule.Choice[]
  choicesJs?: ChoicesJs
  choicesValue: any
}

declare module "metaliq" {
  namespace Policy {
    interface State<T, P> extends SelectorState {
      this?: State<T, P>
    }
  }
}

const Choices = <any>getModuleDefault(ChoicesModule, "Choices") as typeof ChoicesModule.default

export const innerSelector = <T, P = any>(options: SelectorOptions<T, P> = {}): MetaView<T, P> => (v, $) => {
  options = { sort: true, ...options }

  const resetChoices = (choicesJs: ChoicesJs = $.state.choicesJs) => {
    if (!choicesJs) return
    choicesJs.clearStore()
    $.state.choices?.forEach(choice => { delete choice.selected })
    if (hasValue($)) {
      const values = Array.isArray(v) ? v : [v]
      for (const val of values) {
        const selected = $.state.choices.find(c => c.value === val)
        if (!selected) {
          console.warn(`Invalid selector value for ${$.key} : ${v}`)
        } else {
          selected.selected = true
        }
      }
    }
    choicesJs.setChoices($.state.choices, "value", "label", true)
  }

  const disabled = $.fn(isDisabled)

  if (typeof options.choices === "function") {
    const oldChoices = JSON.parse(JSON.stringify(
      $.state.choices || [],
      (k, v) => ["$", "selected"].includes(k) ? undefined : v)
    )
    const newChoices = options.choices(v, $) || []
    if (!equals(newChoices, oldChoices)) {
      if ($.state.choices) $.state.choicesValue = $.value = null // There was previously a different initialised choice list
      $.state.choices = newChoices
      resetChoices()
    }
  } else if (Array.isArray(options.choices)) {
    $.state.choices = options.choices
  } else {
    $.state.choices = []
  }
  if (!equals($.value, $.state.choicesValue)) {
    resetChoices()
    $.state.choicesValue = $.value
  }

  return html`
    ${guard($, () => {
      const id = `mq-selector-${Math.ceil(Math.random() * 1000000)}`

      setTimeout(
        () => {
          const el = document.querySelector(`#${id}`)
          // eslint-disable-next-line no-new -- No need to hold reference to Choices
          $.state.choicesJs = new Choices(el, {
            searchPlaceholderValue: options.searchText ?? "",
            allowHTML: true,
            removeItems: true,
            removeItemButton: true,
            shouldSort: !!options.sort,
            callbackOnInit: function () {
              v = $.value // Refresh value in closure as this call is out-of-band
              resetChoices(<unknown> this as ChoicesJs)
            }
          })

          if (typeof options.searchFn === "function") {
            const asyncListener = async (e: any) => {
              // TODO: Debounce
              const searchText = e.detail.value
              $.state.choices = await options.searchFn(searchText, $.parent$)
              resetChoices()
            }

            el.addEventListener("search", e => { asyncListener(e).catch(console.error) })
          }
        }
      )

      return html`
        <select id=${id}
          data-mq-field-key=${fieldKey(v, $)}
          data-mq-field-path=${fieldPath(v, $)}
          @change=${up(onChange(options), $)}
          @addItem=${up(onAddItem(options), $)}
          @removeItem=${up(onRemoveItem(options), $)}
          ?multiple=${options.multiple}
          ?disabled=${disabled}
          class="mq-input ${classMap({ "mq-disabled": disabled })}"
        >
          ${options.multiple ? "" : html`
            <option value="">${$.term("label")}</option>
          `}
        </select>
      `
    })}
  `
}

export const selector = <T, P = any>(options: SelectorOptions<T, P> = {}): MetaView<T, P> => {
  options = { type: "select", ...options }
  return fieldContainer(options)(innerSelector(options))
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

const onChange = (options: SelectorOptions<any>) => ($: Meta$<any>, event: Event) => {
  if (state.proposedChange?.type === "Add") {
    if (options.multiple) {
      $.value = $.value || []
      $.value.push(state.proposedChange.value)
    } else {
      $.value = state.proposedChange.value
    }
  } else if (state.proposedChange?.type === "Remove") {
    if (options.multiple) {
      remove($.value, state.proposedChange.value)
    } else {
      $.value = null
    }
  }
  $.state.choicesValue = $.value
  validate($)
  state.proposedChange = null
}

const onAddItem = (options: SelectorOptions<any>) => ($: Meta$<any>, event: { detail: { value: string } }) => {
  state.proposedChange = {
    type: "Add",
    value: event?.detail?.value
  }
}

const onRemoveItem = (options: SelectorOptions<any>) => ($: Meta$<any>, event: { detail: { value: string } }) => {
  state.proposedChange = {
    type: "Remove",
    value: event?.detail?.value
  }
}
