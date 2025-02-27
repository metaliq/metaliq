import { errorMsg, fieldClasses, fieldLabel, FieldOptions, isDisabled, isFieldDisabled } from "./forms"
import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { classMap } from "lit/directives/class-map.js"
import { up } from "@metaliq/up"
import { Meta$ } from "metaliq"
import { validate } from "@metaliq/validation"
import { ifDefined } from "lit/directives/if-defined.js"

export type TextAreaOptions = FieldOptions<string> & {
  cols?: number
  rows?: number
}

export const textArea = (options: TextAreaOptions = {}): MetaView<string> => $ => html`
  <label class="mq-field mq-text-area-field ${
    classMap({ [options.classes]: !!options.classes, ...fieldClasses(options)($) })
  }">
    ${fieldLabel(options)($)}
    <textarea 
      cols=${ifDefined(options.cols)}
      rows=${options.rows ?? 3}
      ?disabled=${isFieldDisabled(options)($)}
      class="mq-input ${classMap({
        "mq-error-field": $.state.error,
        "mq-disabled": isDisabled($)
      })}"
      @focus=${up(onFocus, $)}
      @blur=${up(onBlur, $)}
    >${$.value ?? ""}</textarea>
    ${errorMsg({ classes: "mq-field-error" })($)}
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
