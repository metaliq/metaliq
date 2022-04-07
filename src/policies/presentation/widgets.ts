import { html } from "lit"
import { live } from "lit/directives/live.js"
import { classMap } from "lit/directives/class-map.js"
import { up, Update } from "@metaliq/up"
import { commit, FieldKey, fieldKeys, isMetaArray, Meta, meta, MetaArray, metaCall, MetaFn } from "../../meta"
import { validate } from "../validation/validation"
import { labelOrKey, labelPath } from "../terminology/terminology"
import { MetaView, view, ViewResult, viewWithFallback } from "./presentation"

export { expander } from "./expander"
export { AnimatedHideShow } from "./animated-hide-show"

export type MetaFormOptions<T> = {
  classes?: string
  include?: Array<FieldKey<T>>
  exclude?: Array<FieldKey<T>>
}

/**
 * A MetaView for an object type that displays all its child fields.
 */
export const metaForm = <T>(options: MetaFormOptions<T> = {}): MetaView<T> => (v, m) => {
  m = m || meta(v)
  return html`
    <div class="mq-form ${options.classes || ""}" >
      ${fieldKeys(m?.$.spec)
        .filter(key =>
          (!options.include || options.include.includes(key)) &&
          (!(options.exclude || []).includes(key))
        )
        .map(key => {
          const fieldMeta = m[key]
          if (isMetaArray(fieldMeta)) {
            return metaCall(viewWithFallback(repeatView))(<unknown>fieldMeta as Meta<T[]>)
          } else {
            const itemView = fieldMeta.$.spec.view || defaultFieldView(fieldMeta as Meta<any>)
            return view(itemView)(fieldMeta)
          }
        })}
    </div>
  `
}

export const repeatView: MetaView<any[]> = (v, m) => {
  m = m || meta(v)

  const metaArr = <unknown>m as MetaArray<any>
  const itemView = view(m.$.spec.items?.view || defaultFieldView(metaArr[0]))

  return metaArr.map(itemMeta => {
    return metaCall(itemView)(itemMeta)
  })
}

/**
 * Return a default view for a meta based upon its value type.
 */
const defaultFieldView = <T> (meta: Meta<T>): MetaView<T> => {
  if (!meta) { // Possible when used on empty array
    return () => "Default view for non-existent meta"
  } else if (typeof meta.$.value === "object") {
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
export const ifThen = <T, P = any, C = any> (
  condition: MetaFn<T, P, any, boolean>,
  thenView: MetaView<T, P, C>,
  elseView?: MetaView<T, P, C>
): MetaView<T, P, C> => (v, m) => condition(v, m) ? thenView(v, m) : elseView?.(v, m) ?? ""

export type InputOptions<T> = {
  type?: "text" | "checkbox" | "number" | "tel"
  commit?: boolean // immediately commit values to underlying value object
  unvalidated?: boolean // don't perform validation
  labelAfter?: boolean // Place the label after the input
  labelView?: MetaView<T> // Custom label content function
  classes?: string // Additional class(es) for field container
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
    />
  `
}

/**
 * Return the first explicitly defined disabled state by searching on the meta
 * and then ascending through its ancestors. If none is found, return false.
 */
export const isDisabled = (meta: Meta<any>): boolean => {
  let check = meta
  while (check) {
    if (typeof check.$.state.disabled === "boolean") return check.$.state.disabled
    check = check.$.parent
  }
  return false
}

/**
 * Configurable input field.
 * Leave options blank for a default text input field with validation.
 */
export const inputField = <T>(options: InputOptions<T> = {}): MetaView<T> => (value, meta) => html`
  <label class="mq-field ${classMap({
    [options.classes]: !!options.classes,
    [`mq-${options.type || "text"}-field`]: true,
    "mq-mandatory": meta.$.state.mandatory,
    "mq-active": meta.$.state.active,
    "mq-populated": !!meta.$.value
  })}" >
    ${!options.labelAfter ? fieldLabel(options)(value, meta) : ""}
    ${input({ type: "text", ...options })(value, meta)}
    ${options.labelAfter ? fieldLabel(options)(value, meta) : ""}
    ${errorMsg({ classes: "mq-field-error" })(value, meta as Meta<unknown>)}
  </label>
`

/**
 * Label element for input field.
 */
export const fieldLabel = <T>(options: InputOptions<T>): MetaView<T> => (value, meta) =>
  typeof options.labelView === "function"
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
export const errorMsg = <T> (options: { classes?: string } = {}): MetaView<T> => (value, mValue) => {
  mValue = mValue || meta(value)
  const error = mValue.$.state.error
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

const onInput = <T>({ unvalidated, commit: doCommit, type }: InputOptions<T>) =>
  (meta: Meta<T>, event: Event) => {
    const target = <HTMLInputElement>event.target
    meta.$.value = <unknown>(target.type === "checkbox"
      ? target.checked
      : type === "number"
        ? parseFloat(target.value)
        : target.value) as T
    if (!unvalidated) validate(meta)
    if (doCommit && meta.$.parent) commit(meta.$.parent)
  }

export const errorsBlock: MetaView<any> = (v, m) => {
  m = m || meta(v)
  return html`
    <div class="mq-error-msg mq-page-error">
      ${m.$.state.allErrors?.map(mError => html`
        <div class="mq-error-label">${labelPath(m, mError)}</div>
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
