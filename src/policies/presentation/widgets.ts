import { html } from "lit"
import { live } from "lit/directives/live.js"
import { classMap } from "lit/directives/class-map.js"
import { up, Update } from "@metaliq/up"
import { $Fn, FieldKey, fieldKeys, IsMeta, isMetaArray, meta, Meta, MetaArray, metarr, metaSetups } from "../../meta"
import { hasValue, validate } from "../validation/validation"
import { labelOrKey, labelPath } from "../terminology/terminology"
import { MetaView, view, ViewResult } from "./presentation"
import { ifDefined } from "lit/directives/if-defined.js"

export { expander } from "./expander"
export { AnimatedHideShow } from "./animated-hide-show"

export type MetaFormOptions<T> = {
  baseClass?: string // Base class defaults to mq-form
  classes?: string
  include?: Array<FieldKey<T>>
  exclude?: Array<FieldKey<T>>
}

metaSetups.push(meta => {
  // Default the review method of the top level spec to renderPage if not assigned and this policy has been loaded
  if (!meta.$.parent && !meta.$.spec.publication?.target && !meta.$.spec.view) {
    meta.$.spec.view = metaForm()
  }
})

/**
 * A MetaView for an object type that displays all its child fields.
 */
export const metaForm = <T>(options: MetaFormOptions<T> = {}): MetaView<T> => (v, m) => {
  m = m || meta(v)
  return html`
    <div class="${options.baseClass ?? "mq-form"} ${options.classes || ""}" >
      ${fieldKeys(m?.$.spec)
        .filter(key =>
          (!options.include || options.include.includes(key)) &&
          (!(options.exclude || []).includes(key))
        )
        .map(key => {
          const fieldMeta = m[key]
          if (isMetaArray(fieldMeta)) {
            return view(true, repeatView)(fieldMeta)
          } else {
            const itemView = fieldMeta.$.spec.view || defaultFieldView(fieldMeta as Meta<any>)
            return view(itemView)(fieldMeta)
          }
        })}
    </div>
  `
}

export const repeatView: MetaView<any[]> = $ => {
  const metaArr = <unknown>$.meta as MetaArray<any>
  const itemView = view($.spec.items?.view || defaultFieldView(metarr($.value)[0]))

  return metaArr.map(itemMeta => itemView(itemMeta))
}

/**
 * Return a default view for a meta based upon its value type.
 */
const defaultFieldView = <T> (meta: IsMeta<T>): MetaView<T> => {
  if (!meta) { // Possible when used on empty array
    return () => "Default view for non-existent meta"
  } else if (meta.$.value && typeof meta.$.value === "object") {
    return metaForm()
  } else if (typeof meta.$.value === "boolean") {
    return <unknown>checkboxField() as MetaView<T>
  } else if (typeof meta.$.value === "number") {
    return inputField({ type: "number" })
  } else return inputField()
}

/**
 * Return a view that consists of the given text or HTML template.
 */
export const content = (textOrHtml: ViewResult): MetaView<any> => meta => textOrHtml

/**
 * Conditional display field.
 * If the condition is met, the `then` view is shown.
 * Optionally an `else` view can be specified to show if condition not met.
 */
export const ifThen = <T, P = any> (
  condition: $Fn<T, P, boolean>,
  thenView: MetaView<T, P>,
  elseView?: MetaView<T, P>
): MetaView<T, P> => (v, m) => condition(v, m) ? thenView(v, m) : elseView?.(v, m) ?? ""

export type InputOptions<T> = {
  type?: "text" | "checkbox" | "number" | "tel"
  unvalidated?: boolean // don't perform validation
  labelAfter?: boolean // Place the label after the input
  labelView?: MetaView<T> // Custom label content function
  classes?: string // Additional class(es) for field container
  autocomplete?: string
}

/**
 * Basic input element that uses some InputOptions.
 * To get full use of all options use `inputField`.
 */
export const input = <T>(options: InputOptions<T> = {}): MetaView<T> => (value, meta) => {
  const disabled = isDisabled(meta)
  return html`
    <input type=${options.type || "text"}
      ?disabled=${disabled}
      class="mq-input ${classMap({
        "mq-error-field": meta.$.state.error,
        "mq-disabled": disabled
      })}"
      .value=${live(meta.$.value ?? "")}
      @focus=${up(onFocus, meta)}
      @blur=${up(onBlur(options), meta)}
      @click=${options.type === "checkbox" ? up(onInput(options), meta, { doDefault: true }) : () => {}}
      .checked=${options.type === "checkbox" && meta.$.value}
      autocomplete=${ifDefined(options.autocomplete)}
    />
  `
}

/**
 * Return the first explicitly defined disabled state by searching on the meta
 * and then ascending through its ancestors. If none is found, return false.
 */
export const isDisabled: $Fn<any, any, any, boolean> = ({ meta }): boolean => {
  let check = meta
  while (check) {
    if (typeof check.$.state.disabled === "boolean") return check.$.state.disabled
    check = check.$.parent
  }
  return false
}

/**
 * A standard set of field classes for the meta.
 */
export const fieldClasses: $Fn<any> = (v, meta) => {
  return {
    "mq-mandatory": meta.$.state.mandatory,
    "mq-active": meta.$.state.active,
    "mq-populated": hasValue(meta),
    "mq-disabled": isDisabled(meta)
  }
}

/**
 * Configurable input field.
 * Leave options blank for a default text input field with validation.
 */
export const inputField = <T>(options: InputOptions<T> = {}): MetaView<T> => $ => html`
  <label class="mq-field ${classMap({
    [options.classes]: !!options.classes,
    [`mq-${options.type || "text"}-field`]: true,
    ...fieldClasses($)
  })}" >
    ${!options.labelAfter ? fieldLabel(options)($) : ""}
    ${input({ type: "text", ...options })($)}
    ${options.labelAfter ? fieldLabel(options)($) : ""}
    ${errorMsg({ classes: "mq-field-error" })($)}
  </label>
`

/**
 * Label element for input field.
 */
export const fieldLabel = <T>(options?: InputOptions<T>): MetaView<T> => (value, meta) =>
  typeof options?.labelView === "function"
    ? options.labelView(value, meta)
    : html`<span class="mq-input-label">${labelOrKey(meta)}</span>`

/**
 * Input field with default options for a validated checkbox
 */
export const checkboxField = (options: InputOptions<boolean> = {}): MetaView<boolean> =>
  inputField({
    type: "checkbox",
    labelAfter: true,
    ...options
  })

/**
 * Error message for the given field.
 */
export const errorMsg = (options: { classes?: string } = {}): MetaView<any> => ($) => {
  const error = $.state.error
  const errorMsg = typeof error === "string" ? error : "Invalid value"
  const classes = `mq-error-msg ${options.classes ?? ""}`
  return error ? html`<span class=${classes}>${errorMsg}</span>` : ""
}

export const fieldError: MetaView<any> = errorMsg({ classes: "mq-field-error" })
export const pageError: MetaView<any> = errorMsg({ classes: "mq-page-error" })

function onFocus (meta: Meta<any>) {
  meta.$.state.active = true
}

const onBlur = <T>(options: InputOptions<T>) => (meta: Meta<T>, event: Event) => {
  meta.$.state.active = false
  if (options.type !== "checkbox") onInput(options)(meta, event)
}

const onInput = <T>({ unvalidated, type }: InputOptions<T>) =>
  (meta: Meta<T>, event: Event) => {
    const target = <HTMLInputElement>event.target
    meta.$.value = <unknown>(target.type === "checkbox"
      ? target.checked
      : type === "number"
        ? parseFloat(target.value)
        : target.value) as T
    if (!unvalidated) validate(meta)
  }

export const errorsBlock: MetaView<any> = ({ state, meta }) => {
  return html`
    <div class="mq-error-msg mq-page-error">
      ${state.allErrors?.map(mError => html`
        <div class="mq-error-label">${labelPath(meta, mError)}</div>
        <div>${mError.$.state.error}</div>
      `)}
    </div>
  `
}

export type ButtonOptions<T> = {
  label?: string
  classes?: string
  onClick?: Update<Meta<T>>
}

export const button = <T>(options: ButtonOptions<T> = {}): MetaView<T> => (value, meta) => html`
  <button class="mq-button ${options.classes ?? ""}" @click=${up(options.onClick, meta)}>
    ${options.label ?? "Button"}
  </button> 
`

export const formPage = <T>(content: MetaView<T>): MetaView<T> => (value, meta) => html`
  <div class="mq-form-page">${content(value, meta)}</div>
`
