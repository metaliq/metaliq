import { errorMsg, fieldClasses, fieldLabel, FieldOptions, isDisabled } from "./forms"
import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { classMap } from "lit/directives/class-map.js"
import { up } from "@metaliq/up"
import { Meta$ } from "metaliq"
import { validate } from "@metaliq/validation"

export const textArea = (options: FieldOptions<string> = {}): MetaView<string> => (v, $) => html`
  <label class="mq-field mq-text-area-field ${
    classMap({ [options.classes]: !!options.classes, ...fieldClasses($) })
  }">
    ${fieldLabel(options)(v, $)}
    <textarea rows=3
      ?disabled=${isDisabled($)}
      class="mq-input ${classMap({
        "mq-error-field": $.state.error,
        "mq-disabled": isDisabled($)
      })}"
      @focus=${up(onFocus, $)}
      @blur=${up(onBlur, $)}
    />${$.value ?? ""}</textarea>
    ${errorMsg({ classes: "mq-field-error" })(v, $)}
  </label>
`

const onFocus = ($: Meta$<any>) => {
  $.state.active = true
}

const onBlur = ($: Meta$<any>, event: Event) => {
  $.value = (<HTMLTextAreaElement>event.target).value
  $.state.active = false
  validate($)
}
