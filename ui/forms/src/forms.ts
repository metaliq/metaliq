import { html } from "lit"
import { live } from "lit/directives/live.js"
import { classMap } from "lit/directives/class-map.js"
import { up } from "@metaliq/up"
import { FieldKey, fieldKeys, HasMeta$, isMeta, isMetaArray, m$, Meta$, MetaFn, metaSetups } from "metaliq"
import { hasValue, validate } from "@metaliq/validation"
import { labelOrKey, labelPath } from "@metaliq/terminology"
import { MetaView, view, ViewResult } from "@metaliq/presentation"
import { ifDefined } from "lit/directives/if-defined.js"

export { expander } from "@metaliq/elements"
export { AnimatedHideShow } from "@metaliq/elements"

export type MetaFormOptions<T> = {
  baseClass?: string // Base class defaults to mq-form
  classes?: string
  include?: Array<FieldKey<T>>
  exclude?: Array<FieldKey<T>>
}

metaSetups.push($ => {
  // Default the review method of the top level spec to renderPage if not assigned and this policy has been loaded
  if (!$.parent && !$.spec.publicationTarget && !$.spec.view) {
    $.spec.view = metaForm()
  }
})

/**
 * A MetaView for an object type that displays all its child fields.
 */
export const metaForm = <T>(options: MetaFormOptions<T> = {}): MetaView<T> => (v, $ = m$(v)) => {
  const { meta } = $
  if (isMeta(meta)) {
    return html`
      <div class="${options.baseClass ?? "mq-form"} ${options.classes || ""}" >
        ${fieldKeys($.spec)
          .filter(key =>
            (!options.include || options.include.includes(key)) &&
            (!(options.exclude || []).includes(key))
          )
          .map(key => {
            const fieldMeta = meta[key] as HasMeta$<any>
            const itemView = fieldMeta.$.spec.view || defaultFieldView(fieldMeta.$)
            return view(itemView)(fieldMeta.$.value, fieldMeta.$)
          })}
      </div>
    `
  }
}

export const repeatView: MetaView<any[]> = (v, $) => {
  if (isMetaArray($.meta)) {
    const itemView = view($.spec.items?.view || defaultFieldView($.meta[0].$))

    return $.meta.map(({ $ }) => {
      return itemView($.value, $)
    })
  } else return ""
}

/**
 * Return a default view for a meta based upon its value type.
 */
const defaultFieldView = <T> ($: Meta$<T>): MetaView<T> => {
  if (!$) { // Possible when used on empty array
    return () => "Default view for non-existent meta"
  } else if (Array.isArray($.meta)) {
    // T is an array type
    return <unknown>repeatView as MetaView<T>
  } else if ($.value && typeof $.value === "object") {
    return metaForm()
  } else if (typeof $.value === "boolean") {
    return <unknown>checkboxField() as MetaView<T>
  } else if (typeof $.value === "number") {
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
  condition: MetaFn<T, P, boolean>,
  thenView: MetaView<T, P>,
  elseView?: MetaView<T, P>
): MetaView<T, P> => (v, m) => condition(v, m) ? thenView(v, m) : elseView?.(v, m) ?? ""

/**
 * General options for all MetaliQ form fields.
 * Individual fields can define their own options types, which would normally extend this type.
 */
export type FieldOptions<T> = {
  labelView?: MetaView<T> // Custom label content function
  classes?: string // Additional class(es) for field container
}

/**
 * Options for input and similar fields.
 */
export type InputOptions<T> = FieldOptions<T> & {
  type?: "text" | "checkbox" | "number" | "tel"
  unvalidated?: boolean // don't perform validation
  labelAfter?: boolean // Place the label after the input
  autocomplete?: string
}

/**
 * Basic input element that uses some InputOptions.
 * To get full use of all options use `inputField`.
 */
export const input = <T>(options: InputOptions<T> = {}): MetaView<T> => (v, $) => {
  const disabled = isDisabled($)
  return html`
    <input type=${options.type || "text"}
      ?disabled=${disabled}
      class="mq-input ${classMap({
        "mq-error-field": $.state.error,
        "mq-disabled": disabled
      })}"
      .value=${live($.value ?? "")}
      @focus=${up(onFocus, $)}
      @blur=${up(onBlur(options), $)}
      @click=${options.type === "checkbox" ? up(onInput(options), $, { doDefault: true }) : () => {}}
      .checked=${options.type === "checkbox" && $.value}
      autocomplete=${ifDefined(options.autocomplete)}
    />
  `
}

/**
 * Test whether the field is disabled.
 * Can accept the meta info $ (recommended)
 * or the associated data value (not a primitive).
 *
 * Returns the first explicitly defined disabled state by searching on the meta
 * and then ascending through its ancestors. If none is found, return false.
 */
export const isDisabled = <T, P>(v$: T | Meta$<T, P>): boolean => {
  const $ = (m$(v$) || v$) as Meta$<T, P>
  let parent: HasMeta$<any> = $.meta
  while (parent) {
    if (typeof parent.$.state.disabled === "boolean") return parent.$.state.disabled
    parent = parent.$.parent
  }
  return false
}

/**
 * A standard set of field classes for the meta.
 * Can pass the meta info $ object (recommended)
 * or its associated data value (not a primitive).
 */
export const fieldClasses = <T, P> (v$: T | Meta$<T, P>) => {
  const $ = (m$(v$) || v$) as Meta$<T, P>
  return {
    "mq-mandatory": $.state.mandatory,
    "mq-active": $.state.active,
    "mq-populated": hasValue($),
    "mq-disabled": isDisabled($)
  }
}

/**
 * Configurable input field.
 * Leave options blank for a default text input field with validation.
 */
export const inputField = <T>(options: InputOptions<T> = {}): MetaView<T> => (v, $) => html`
  <label class="mq-field ${classMap({
    [options.classes]: !!options.classes,
    [`mq-${options.type || "text"}-field`]: true,
    ...fieldClasses($)
  })}" >
    ${!options.labelAfter ? fieldLabel(options)(v, $) : ""}
    ${input({ type: "text", ...options })(v, $)}
    ${options.labelAfter ? fieldLabel(options)(v, $) : ""}
    ${errorMsg({ classes: "mq-field-error" })(v, $)}
  </label>
`

/**
 * Label element for input field.
 */
export const fieldLabel = <T>(options?: FieldOptions<T>): MetaView<T> => (value, $) =>
  typeof options?.labelView === "function"
    ? options.labelView(value, $)
    : html`<span class="mq-input-label">${labelOrKey($)}</span>`

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
export const errorMsg = (options: { classes?: string } = {}): MetaView<any> => (v, $ = m$(v)) => {
  const error = $.state.error
  const errorMsg = typeof error === "string" ? error : "Invalid value"
  const classes = `mq-error-msg ${options.classes ?? ""}`
  return error ? html`<span class=${classes}>${errorMsg}</span>` : ""
}

export const fieldError: MetaView<any> = errorMsg({ classes: "mq-field-error" })
export const pageError: MetaView<any> = errorMsg({ classes: "mq-page-error" })

function onFocus ($: Meta$<any>) {
  $.state.active = true
}

const onBlur = <T>(options: InputOptions<T>) => ($: Meta$<T>, event: Event) => {
  $.state.active = false
  if (options.type !== "checkbox") onInput(options)($, event)
}

const onInput = <T>({ unvalidated, type }: InputOptions<T>) =>
  ($: Meta$<T>, event: Event) => {
    const target = <HTMLInputElement>event.target
    $.value = <unknown>(target.type === "checkbox"
      ? target.checked
      : type === "number"
        ? parseFloat(target.value)
        : target.value) as T
    if (!unvalidated) validate($)
  }

export const errorsBlock: MetaView<any> = (v, $ = m$(v)) => {
  return html`
    <div class="mq-error-msg mq-page-error">
      ${$.state.allErrors?.map(error$ => html`
        <div class="mq-error-label">${labelPath($.meta, error$.meta)}</div>
        <div>${error$.state.error}</div>
      `)}
    </div>
  `
}

export type ButtonOptions<T> = {
  label?: string
  classes?: string
  onClick?: MetaFn<T>
}

export const button = <T>(options: ButtonOptions<T> = {}): MetaView<T> => (value) => html`
  <button class="mq-button ${options.classes ?? ""}" @click=${up(options.onClick, value)}>
    ${options.label ?? "Button"}
  </button> 
`

export const formPage = <T>(content: MetaView<T>): MetaView<T> => (value, $) => html`
  <div class="mq-form-page">${content(value, $)}</div>
`
