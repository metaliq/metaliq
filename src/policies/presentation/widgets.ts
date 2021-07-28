import { html } from "lit"
import { up } from "../transition/up"
import { FieldKey, fieldKeys, Meta, Meta$, MetaUpdate } from "../../meta"
import { validate } from "../validation/validation"
import { labelPath } from "../terminology/terminology"
import { ViewResult, View } from "./view"
import { Condition } from "../deduction/deduction"

export const fieldClasses = (span: number = 12) => `block text-sm font-medium text-gray-700 col-span-${span}`
export const inputClasses = "mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm border-gray-300 rounded-md"
export const errorClasses = (meta: Meta$<any>) => meta.$.state.error ? " bg-red-100 border-red-300" : ""

export const namedFieldViews = <T>(fields: Array<FieldKey<T>>): View<T> =>
  meta => grid(
    fields.map(fieldViewForMeta(meta))
  )

export const allFieldViews: View<any> = meta => grid(
  fieldKeys(meta.$.spec).map(fieldViewForMeta(meta))
)

export const mixedForm = <T, P = any>(items: Array<FieldKey<T> | View<T>>): View<T, P> =>
  meta => grid(
    items.map(item => {
      if (typeof item === "string") {
        return fieldView(item)(meta)
      } else return (item)(meta)
    })
  )

export const fieldView = <T>(fieldKey: FieldKey<T>): View<T> =>
  meta => {
    const field = meta[fieldKey]
    const view = field.$.spec.view || validatedInput
    return view(field)
  }

export const validatedInput: View<any> = meta => html`
  <label class=${fieldClasses()}>
    ${meta.$.spec.label}
    <input type="text"
      class=${inputClasses + errorClasses(meta)}
      value=${meta.$.value ?? ""}
      @blur=${up(validateInput, meta)} />
    ${errorMsg(meta, "mt-2")}
  </label>
`

const fieldViewForMeta = <T>(meta: Meta<T>) => (key: FieldKey<T>) => fieldView(key)(meta)

const errorMsg = (meta: Meta<any>, classes = "") => {
  const error = meta.$.state.error
  const errorMsg = typeof error === "string" ? error : "Invalid value"
  classes = `block text-red-500 ${classes}`
  return error ? html`<span class=${classes}>${errorMsg}</span>` : ""
}

function validateInput (meta: Meta<any>, event: Event) {
  meta.$.value = (<HTMLInputElement>event.target).value
  validate(meta)
}

export const errorsBlock: View<any> = meta => html`
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

export const section = <T>(content: View<T>): View<T> => meta => html`
  <div class="mx-4 mt-4 md:mt-0 first:mt-4 col-span-12">
    <div class="md:grid md:grid-cols-3 md:gap-6">
      <div class="md:col-span-1">
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

  <div class="hidden sm:block" aria-hidden="true">
    <div class="py-5">
      <div class="border-t border-gray-200"></div>
    </div>
  </div>
`

export const button = <T>(click: MetaUpdate<T>): View<T> => meta => html`
  <button @click=${up(click, meta)}>Click</button> 
`

export const ifThen = <T, P = any>(
  condition: Condition<T, P, boolean>,
  thenView: View<T>,
  elseView?: View<T>
): View<T, P> =>
    meta => condition(meta) ? thenView(meta) : elseView?.(meta) ?? ""
