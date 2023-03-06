import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { classMap } from "lit/directives/class-map.js"
import { guard } from "lit/directives/guard.js"
import { fieldClasses, fieldLabel } from "@metaliq/forms"
import { up } from "@metaliq/up"
import SignaturePad from "signature_pad"
import { Meta$ } from "metaliq"

export type SignaturePadFormat = "PNG" | "JPG" | "SVG" | "RAW"

export type SignaturePadOptions = {
  /**
   * Any valid CSS color, e.g. "red", "#a1b2c3", "hsl(50 80% 40%)", etc.
   */
  penColor?: string

  /**
   * Any valid CSS color, e.g. "red", "#a1b2c3", "hsl(50 80% 40%)", etc.
   */
  backgroundColor?: string

  /**
   * Signature data value is a data URL in one of the formats:
   * PNG, JPG, SVG, RAW.
   * If one of the first four is used, the data will be stored
   * in the form of a data:// URL.
   * In the case of RAW, data will be stored as a JSON representation
   * of signature_pad's internal structure.
   * Experiments suggest this is typically the most efficient format
   * (although relative performance would depend on the complexity of the signature)
   * and so this is used as the default.
   *
   * Unless you have a good reason to need data stored as an image URL,
   * the recommended approach is to stick with RAW.
   */
  format?: SignaturePadFormat
}

const defaultSignaturePadOptions: SignaturePadOptions = {
  penColor: "black",
  format: "PNG"
}

const sigPadFormatMap: { [index in SignaturePadFormat]: string } = {
  PNG: "",
  JPG: "image/jpeg",
  SVG: "image/svg+xml",
  RAW: ""
}

/**
 * A configurable MetaView<string> that displays a signature pad
 * and saves the value as either a data URL or a JSON string (recommended).
 */
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
          const canvas: HTMLCanvasElement = document.querySelector(`#${id}`)
          sigPad = new SignaturePad(canvas, {
            penColor: options.penColor,
            backgroundColor: options.backgroundColor
          })

          sigPad.addEventListener("endStroke", () => {
            up(() => {
              if (options.format === "RAW") {
                $.value = JSON.stringify(sigPad.toData())
              } else {
                $.value = sigPad.toDataURL(sigPadFormatMap[options.format])
              }
            })()
          })

          const ratio = Math.max(window.devicePixelRatio || 1, 1)

          // Clear and resize canvas
          canvas.width = canvas.offsetWidth * ratio
          canvas.height = canvas.offsetHeight * ratio
          canvas.getContext("2d").scale(ratio, ratio)

          // Display current sig pad value
          if ($.value) {
            try {
              if (options.format === "RAW") {
                sigPad.fromData(JSON.parse($.value))
              } else {
                sigPad.fromDataURL($.value)
              }
            } catch (e) {
              console.warn("Invalid value for signature pad")
            }
          }
        }, 100)
        return html`
          <canvas class="mq-input" id=${id} height="600" width="1000" >  </canvas>
          <button class="mq-field-clear" @mouseup=${up(clearSignature, $)} > </button>
        `
      })}
    </label>
  `
}
