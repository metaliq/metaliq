import { html } from "lit"
import { live } from "lit/directives/live.js"
import { ifDefined } from "lit/directives/if-defined.js"
import { classMap } from "lit/directives/class-map.js"
import { up, Update } from "../transition/up"
import { FieldKey, fieldKeys, Meta } from "../../meta"
import { validate } from "../validation/validation"
import { labelPath } from "../terminology/terminology"
import { MetaView, ViewResult } from "./presentation"
import { Condition } from "../deduction/deduction"

export const namedFieldViews = <T>(fields: Array<FieldKey<T>>): MetaView<T> =>
  meta => grid(
    fields.map(fieldViewForMeta(meta))
  )

export const allFieldViews: MetaView<any> = meta => grid(
  fieldKeys(meta.$.spec).map(fieldViewForMeta(meta))
)

export const mixedForm = <T, P = any>(items: Array<FieldKey<T> | MetaView<T>>): MetaView<T, P> =>
  meta => grid(
    items.map(item => {
      if (typeof item === "string") {
        return fieldView(item)(meta)
      } else return (item)(meta)
    })
  )

export const fieldView = <T>(fieldKey: FieldKey<T>): MetaView<T> =>
  meta => {
    const fieldValue = meta[fieldKey]
    if (Array.isArray(fieldValue)) {
      const view = fieldValue.$.spec.items?.view || validatedInput
      return fieldValue.map(view)
    } else {
      const view = fieldValue.$.spec.view || validatedInput
      return view(fieldValue)
    }
  }

export const validatedInput: MetaView<any> = meta => html`
  <label class="block text-sm font-medium text-gray-700 col-span-12">
    ${meta.$.spec.label}
    <input type="text"
      disabled=${ifDefined(meta.$.state.disabled)}
      class="mq-input ${classMap({
        "mq-error": meta.$.state.error,
        "mq-disabled": meta.$.state.disabled
      })}"
      value=${live(meta.$.value ?? "")}
      @blur=${up(validateInput, meta)} />
    ${errorMsg(meta, "mt-2")}
  </label>
`

const fieldViewForMeta = <T>(meta: Meta<T>) => (key: FieldKey<T>) => fieldView(key)(meta)

export const errorMsg = (meta: Meta<any>, classes = "") => {
  const error = meta.$.state.error
  const errorMsg = typeof error === "string" ? error : "Invalid value"
  classes = `block text-red-500 ${classes}`
  return error ? html`<span class=${classes}>${errorMsg}</span>` : ""
}

function validateInput (meta: Meta<any>, event: Event) {
  meta.$.value = (<HTMLInputElement>event.target).value
  validate(meta)
}

export const errorsBlock: MetaView<any> = meta => html`
  <div class="text-red-500">
    ${meta.$.state.allErrors.map(errorMeta => html`
      <div class="font-bold">${labelPath(meta, errorMeta)}</div>
      <div>${errorMeta.$.state.error}</div>
    `)}
  </div>
`

const grid = (content: ViewResult) => html`
  <div class="grid grid-cols-12 gap-6">
    ${content}
  </div>
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

export const formPage = <T>(content: MetaView<T>): MetaView<T> => meta => html`
  <div class="bg-gray-100 py-4">${content(meta)}</div>
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
