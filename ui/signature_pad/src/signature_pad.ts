import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { classMap } from "lit/directives/class-map.js"
import { guard } from "lit/directives/guard.js"
import { fieldClasses, fieldLabel } from "@metaliq/forms"
import { up } from "@metaliq/up"
import SignaturePad from "signature_pad"
import { Meta$, MetaFn } from "metaliq"

export type SignaturePadOptions = {
  /**
   * Any valid CSS color, e.g. "red", "#a1b2c3", "hsl(50 80% 40%)", etc.
   */
  penColor?: string

  /**
   * Any valid CSS color, e.g. "red", "#a1b2c3", "hsl(50 80% 40%)", etc.
   */
  backgroundColor?: string
}

const defaultSignaturePadOptions: SignaturePadOptions = {
  penColor: "black"
}

export const signaturePad = (options: SignaturePadOptions = {}): MetaView<string> => (value, $) => {
  options = { ...defaultSignaturePadOptions, ...options }

  return html`
    <label class="mq-field mq-signature-pad-field ${classMap(fieldClasses($))}">
      ${fieldLabel<string>({})(value, $)}
      ${guard($, () => {
        const id = `mq-signature-pad-${Math.ceil(Math.random() * 1000000)}`

        let sigPad: SignaturePad = null

        const clearSignature = ($: Meta$<string>) => {
          $.value = ""
          sigPad.clear()
        }

        setTimeout(() => {
          const canvas = <HTMLCanvasElement>document.querySelector(`#${id}`)
          sigPad = new SignaturePad(canvas, {
            penColor: options.penColor,
            backgroundColor: options.backgroundColor
          })

          const ratio = Math.max(window.devicePixelRatio || 1, 1);

          // This part causes the canvas to be cleared
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          canvas.getContext("2d").scale(ratio, ratio);
        }, 100)
        return html`
          <canvas class="mq-input" id=${id} height="200" width="1000"></canvas>
          <button class="mq-field-clear" @click=${up(clearSignature, $)}></button>
        `
      })}
    </label>
  `
}
