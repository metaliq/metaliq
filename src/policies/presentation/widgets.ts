import { html } from "lit"
import { live } from "lit/directives/live.js"
import { ifDefined } from "lit/directives/if-defined.js"
import { classMap } from "lit/directives/class-map.js"
import { up, Update } from "@metaliq/up"
import { commit, FieldKey, fieldKeys, Meta, MetaArray } from "../../meta"
import { validate } from "../validation/validation"
import { labelPath } from "../terminology/terminology"
import { MetaView, ViewResult } from "./presentation"
import { Condition } from "../deduction/deduction"

export const metaForm: MetaView<any> = <T>(meta: Meta<T>) => form(
  fieldKeys(meta.$.spec).map(key => fieldView(key)(meta))
)

export const fieldView = <T>(fieldKey: FieldKey<T>): MetaView<T> =>
  meta => {
    const fieldMeta = meta[fieldKey]
    if (Array.isArray(fieldMeta)) {
      const view = (<MetaArray<any>>fieldMeta).$.spec.items?.view || validatedInput
      return fieldMeta.map(view)
    } else {
      const view = <unknown>fieldMeta.$.spec.view as MetaView<T> || validatedInput
      return view(fieldMeta)
    }
  }

export type InputOptions = {
  type?: "text" | "checkbox" | "number" | "tel"
  commit?: boolean // immediately commit values to underlying value object
  unvalidated?: boolean // don't perform validation
}

export const input = (options: InputOptions = {}): MetaView<any> => meta => html`
  <input type=${options.type || "text"}
    disabled=${ifDefined(meta.$.state.disabled)}
    class="mq-input ${classMap({
      "mq-error-field": meta.$.state.error,
      "mq-disabled": meta.$.state.disabled
    })}"
    value=${live(meta.$.value ?? "")}
    @blur=${up(onInput(options), meta)} />
`

export const validatedInput: MetaView<any> = meta => html`
  <label class="mq-label">
    ${meta.$.spec.label || meta.$.key}
    ${input()(meta)}
    ${errorMsg(meta, "mt-2")}
  </label>
`

export const validatedCheckbox: MetaView<boolean> = meta => html`
  <label class="mq-label">
    ${input({ type: "checkbox" })(meta)}
    ${meta.$.spec.label}
    ${errorMsg(meta, "mt-2")}
  </label>
`

export const errorMsg = (meta: Meta<any>, classes = "") => {
  const error = meta.$.state.error
  const errorMsg = typeof error === "string" ? error : "Invalid value"
  classes = `mq-error-msg ${classes}`
  return error ? html`<span class=${classes}>${errorMsg}</span>` : ""
}

const onInput = ({ unvalidated, commit: doCommit, type }: InputOptions) =>
  (meta: Meta<any>, event: Event) => {
    const target = <HTMLInputElement>event.target
    meta.$.value = target.type === "checkbox"
      ? target.checked
      : type === "number"
        ? parseFloat(target.value)
        : target.value
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

const form = (content: ViewResult) => html`
  <div class="mq-form">
    ${content}
  </div>
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

export const button = <T>(click: Update<Meta<T>>): MetaView<T> => meta => html`
  <button @click=${up(click, meta)}>Click</button> 
`

export const ifThen = <T, P = any>(
  condition: Condition<T, P, boolean>,
  thenView: MetaView<T>,
  elseView?: MetaView<T>
): MetaView<T, P> =>
    meta => condition(meta) ? thenView(meta) : elseView?.(meta) ?? ""
