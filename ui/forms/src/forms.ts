import { html, TemplateResult } from "lit"
import { live } from "lit/directives/live.js"
import { classMap } from "lit/directives/class-map.js"
import { up } from "@metaliq/up"
import { isMeta, isMetaArray, MaybeFn, meta$, Meta$, MetaFn } from "metaliq"
import { hasValue, validate } from "@metaliq/validation"
import { labelOrKey, labelPath } from "@metaliq/terminology"
import { fields, FieldsOptions, MetaView, MetaViewWrapper, repeat, setViewResolver, ViewResult } from "@metaliq/presentation"
import { ifDefined } from "lit/directives/if-defined.js"
import { APPLICATION } from "@metaliq/application"

export * from "./text-area"
export * from "./grid"

APPLICATION()

export type MetaFormOptions<T> = FieldsOptions<T> & {
  baseClass?: string // Base class defaults to mq-form
  classes?: string
}

/**
 * A MetaView for an object type that displays all its child fields.
 */
export const metaForm = <T>(options: MetaFormOptions<T> = {}): MetaView<T> => (v, $ = meta$(v)) => {
  const { meta } = $
  if (isMeta(meta)) {
    return html`
      <div class="${options.baseClass ?? "mq-form"} ${options.classes || ""}" >
        ${fields(options)(v, $)}
      </div>
    `
  }
}

/**
 * Return a default view for a meta based upon its value type.
 */
const defaultView = <T>(v: T, $: Meta$<T>): MetaView<T> => {
  if (!$) { // Possible when used on empty array
    return () => "Default view for non-existent meta"
  } else if (isMetaArray($.meta)) {
    // T is an array type
    return repeat()
  } else if ($.value && typeof $.value === "object") {
    return fields()
  } else if (typeof v === "boolean") {
    return checkboxField()
  } else if (typeof $.value === "number") {
    return inputField({ type: "number" })
  } else return inputField()
}

setViewResolver(defaultView)

/**
 * General options for all MetaliQ form fields.
 * Individual fields can define their own options types, which would normally extend this type.
 */
export type FieldOptions<T, P = any> = {
  /**
   * Custom label for this field.
   * Normally you'd use the `label` term on the MetaModel itself,
   * and allow the field to represent that text value in its own way.
   * This field option is available for cases such as:
   * * You need alternate text where you have multiple views for the same field.
   * * You want to customise the HTML template for a particular field label.
   * The value can be either a ViewResult (some static HTML or a string)
   * or a MetaView function.
   */
  label?: MaybeFn<T, P, ViewResult>

  /**
   * Additional class(es) for field container
   */
  classes?: string

  /**
   * Field type.
   * If present, used to assign class mq-<type>-field to fieldContainer.
   * Some types of field may make additional use, for example
   * if used on an `inputField`, additionally specifies input type, e.g.
   * "text" | "checkbox" | "number" | "tel".
   */
  type?: string
}

/**
 * Options for input and similar fields.
 */
export type InputOptions<T, P = any> = FieldOptions<T> & {
  unvalidated?: boolean // don't perform validation
  autocomplete?: string
  onChange?: MetaFn<T, P>
}

/**
 * Basic input element that uses some InputOptions.
 * To get full use of all options use `inputField`.
 */
export const input = <T, P = any>(options: InputOptions<T, P> = {}): MetaView<T> => (v, $) => {
  const disabled = $.fn(isDisabled)
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
 *
 * Returns the first explicitly defined disabled state by searching on the meta
 * and then ascending through its ancestors. If none is found, return false.
 */
export const isDisabled: MetaFn<any, any, boolean> = (v, $) => {
  const result = $.term("disabled", true)
  return !!result
}

/**
 * A standard set of field classes for the meta.
 * Can pass the meta info $ object (recommended)
 * or its associated data value (not a primitive).
 */
export const fieldClasses = <T, P = any> (v$: T | Meta$<T, P>) => {
  const $ = (meta$(v$) || v$) as Meta$<T, P>
  return {
    "mq-mandatory": $.term("mandatory"),
    "mq-active": $.state.active,
    "mq-populated": hasValue($),
    "mq-disabled": $.fn(isDisabled)
  }
}

/**
 * Configurable input field.
 * Leave options blank for a default text input field with validation.
 */
export const inputField = <T, P = any>(options: InputOptions<T, P> = {}): MetaView<T> => {
  options.type = options.type || "text"
  return fieldContainer(options)(input({ type: "text", ...options }))
}

/**
 * Label element for input field.
 */
export const fieldLabel = <T>(options?: FieldOptions<T>): MetaView<T> => (value, $) =>
  typeof options?.label === "function"
    ? options.label(value, $)
    : typeof options?.label === "object"
      ? options?.label as TemplateResult
      : html`<span class="mq-input-label">${options?.label || labelOrKey($)}</span>`

/**
 * Standard container for MetaliQ form fields.
 */
export const fieldContainer = <T, P = any>(options?: FieldOptions<T, P>): MetaViewWrapper<T, P> =>
  fieldContent => (v, $) => html`
    <label
      data-mq-field-key=${fieldKey(v, $)}
      data-mq-field-path=${fieldPath(v, $)}
      class="mq-field ${classMap({
        [options?.classes]: !!options?.classes,
        [`mq-${options?.type || "text"}-field`]: options?.type,
        ...fieldClasses($)
      })}">
      ${fieldLabel(options)(v, $)}
      ${$.view(fieldContent)}
      ${fieldError(v, $)}
    </label>
  `

/**
 * Value for the data-mq-field-key attribute of MetaliQ form fields.
 */
export const fieldKey: MetaFn<any> = (v, $) =>
  ($.key ?? "") + (typeof $.index === "number" ? `[${$.index}]` : "")

/**
 * Value for the data-mq-field-path property of MetaliQ form fields.
 */
export const fieldPath: MetaFn<any> = (v, $) => {
  const key = fieldKey(v, $)
  return [$.parent$?.fn(fieldPath), key].filter(Boolean).join(".")
}

/**
 * Input field with default options for a validated checkbox
 */
export const checkboxField = <T> (options: InputOptions<T> = {}): MetaView<T> =>
  inputField({
    type: "checkbox",
    ...options
  })

/**
 * Error message for the given field.
 */
export const errorMsg = (options: { classes?: string } = {}): MetaView<any> => (v, $ = meta$(v)) => {
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

const onInput = <T>({ unvalidated, type, onChange }: InputOptions<T>) =>
  ($: Meta$<T>, event: Event) => {
    const target = <HTMLInputElement>event.target
    const newValue = <unknown>(target.type === "checkbox"
      ? target.checked
      : type === "number"
        ? parseFloat(target.value)
        : target.value) as T
    if (newValue !== $.value) {
      $.value = newValue
      if (typeof onChange === "function") {
        $.fn(onChange)
      }
    }
    if (!unvalidated) validate($)
  }

export const errorsBlock: MetaView<any> = (v, $ = meta$(v)) => {
  return html`
    <div class="mq-error-msg mq-page-error">
      ${$.state.allErrors?.map(error$ => html`
        <div class="mq-error-label">${labelPath($, error$)}</div>
        <div>${error$.state.error}</div>
      `)}
    </div>
  `
}

export type ButtonOptions<T, P = any> = FieldOptions<T, P> & {
  onClick?: MetaFn<T, P>
}

export const button = <T, P = any>(
  options: ButtonOptions<T, P> = {}
): MetaView<T, P> => (v, $ = meta$(v)) => html`
  <button ?disabled=${$?.fn(isDisabled)}
    class="mq-button ${options.classes ?? ""} ${
      options.type ? `mq-${options.type}-button` : ""
    }"
    @click=${$ ? $.up(options.onClick) : up(options.onClick, v)}>
    ${$?.maybeFn(options.label) ?? $?.term("label") ?? options.label}
  </button> 
`
