import { html } from "lit"
import { live } from "lit/directives/live.js"
import { classMap } from "lit/directives/class-map.js"
import { up, Update } from "@metaliq/up"
import { commit, FieldKey, fieldKeys, Meta, MetaArray, MetaFn } from "../../meta"
import { validate } from "../validation/validation"
import { labelPath } from "../terminology/terminology"
import { MetaView, ViewResult } from "./presentation"
import { review } from "../application/application"

export type MetaFormOptions<T> = {
  classes?: string
  include?: Array<FieldKey<T>>
  exclude?: Array<FieldKey<T>>
}

/**
 * A MetaView for an object type that displays all its child fields.
 */
export const metaForm = <T>(options: MetaFormOptions<T> = {}): MetaView<T> => meta => html`
  <div class="mq-form ${options.classes || ""}">
    ${fieldKeys(meta.$.spec)
      .filter(key =>
        (!options.include || options.include.includes(key)) &&
        (!(options.exclude || []).includes(key))
      )
      .map(key => fieldView(key)(meta))}
  </div>
`

/**
 * Return a MetaView for a type that displays the view of a particular field given its key.
 */
export const fieldView = <T>(fieldKey: FieldKey<T>): MetaView<T> => meta => {
  const fieldMeta = meta[fieldKey]
  if (Array.isArray(fieldMeta)) {
    const view = (<MetaArray<any>>fieldMeta).$.spec.items?.view || inputField()
    return fieldMeta.map(itemMeta => {
      review(itemMeta)
      return view(itemMeta)
    })
  } else {
    const view = (<unknown>fieldMeta.$.spec.view || inputField()) as MetaView<any>
    review(fieldMeta)
    return fieldMeta.$.state.hidden ? "" : view(fieldMeta)
  }
}

/**
 * Return a MetaView for a type that combines multiple other MetaViews for that type into a single MetaView.
 */
export const multiView = <T>(...views: Array<MetaView<T>>): MetaView<T> => meta => views.map(view => view(meta))

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
  thenView: MetaView<T>,
  elseView?: MetaView<T>
): MetaView<T, P> => meta => condition(meta) ? thenView(meta) : elseView?.(meta) ?? ""

export type InputOptions<T> = {
  type?: "text" | "checkbox" | "number" | "tel"
  commit?: boolean // immediately commit values to underlying value object
  unvalidated?: boolean // don't perform validation
  labelAfter?: boolean // Place the label after the input
  labelFn?: MetaView<T> // Custom label content function
  fieldClass?: string // Additional class(es) for containing field
  inputClass?: string // Additional class(es) for input element
  labelClass?: string // Additional class(es) for label
  errorClass?: string // Additional class(es) for error message
}

/**
 * Basic input element that uses some InputOptions.
 * To get full use of all options use `inputField`.
 */
export const input = <T>(options: InputOptions<T> = {}): MetaView<T> => meta => html`
  <input type=${options.type || "text"}
    ?disabled=${meta.$.state.disabled}
    class="mq-input ${classMap({
      [options.inputClass]: true,
      "mq-error-field": meta.$.state.error,
      "mq-disabled": meta.$.state.disabled
    })}"
    value=${live(meta.$.value ?? "")}
    @focus=${up(onFocus, meta)}
    @blur=${up(onBlur(options), meta)}
    @click=${options.type === "checkbox" ? up(onInput(options), meta, { doDefault: true }) : () => {}}
    .checked=${options.type === "checkbox" && meta.$.value}
  />
`

/**
 * Configurable input field.
 * Leave options blank for a default text input field with validation.
 */
export const inputField = <T>(options: InputOptions<T> = {}): MetaView<T> => meta => html`
  <label class="mq-field ${classMap({
    [options.fieldClass]: true,
    [`mq-${options.type || "text"}-field`]: true,
    "mq-active": meta.$.state.active,
    "mq-populated": !!meta.$.value
  })}" >
    ${!options.labelAfter ? fieldLabel(options)(meta) : ""}
    ${input({ type: "text", ...options })(meta)}
    ${options.labelAfter ? fieldLabel(options)(meta) : ""}
    ${errorMsg(meta, "mq-field-error")}
  </label>
`

/**
 * Label element for input field.
 */
export const fieldLabel = <T>(options: InputOptions<T>): MetaView<T> => meta =>
  typeof options.labelFn === "function"
    ? options.labelFn(meta)
    : html`<span class="mq-input-label ${options.labelClass}">${meta.$.spec.label || meta.$.key}</span>`

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
export const errorMsg = (meta: Meta<any>, classes = "") => {
  const error = meta.$.state.error
  const errorMsg = typeof error === "string" ? error : "Invalid value"
  classes = `mq-error-msg ${classes}`
  return error ? html`<span class=${classes}>${errorMsg}</span>` : ""
}

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

export const errorsBlock: MetaView<any> = meta => html`
  <div class="text-red-500">
    ${meta.$.state.allErrors.map(errorMeta => html`
      <div class="font-bold">${labelPath(meta, errorMeta)}</div>
      <div>${errorMeta.$.state.error}</div>
    `)}
  </div>
`

export const button = <T>(click: Update<Meta<T>>): MetaView<T> => meta => html`
  <button @click=${up(click, meta)}>Click</button> 
`

export const formPage = <T>(content: MetaView<T>): MetaView<T> => meta => html`
  <div class="mq-form-page">${content(meta)}</div>
`

export const section = <T>(content: MetaView<T>): MetaView<T> => meta => html`
  <div class="mx-4 mt-4 md:mt-0 first:mt-4 col-span-12">
    <div class="md:grid md:grid-cols-3 md:gap-6">
      <div class="md:col-span-1 p-4">
        <div class="px-4 sm:px-0">
          <h3 class="text-lg font-medium leading-6 text-gray-900">
            ${meta.$.spec.label}
          </h3>
          <p class="mt-1 text-sm text-gray-600">
            ${meta.$.spec.helpText}
          </p>
        </div>
      </div>
      <div class="mt-5 md:mt-0 md:col-span-2">
        <form action="#" method="POST">
          <div class="shadow sm:rounded-md sm:overflow-hidden">
            <div class="px-4 py-5 bg-white space-y-6 sm:p-6">
              ${content(meta)}
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div class="hidden sm:block col-span-12" aria-hidden="true">
    <div class="py-5">
      <div class="border-t border-gray-200"></div>
    </div>
  </div>
`
