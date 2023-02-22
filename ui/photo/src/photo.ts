import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { up } from "@metaliq/up"
import { Meta$ } from "metaliq"
import { errorMsg, fieldClasses, fieldLabel, isDisabled } from "@metaliq/forms"
import { classMap } from "lit/directives/class-map.js"
import * as CompressorModule from "compressorjs"
import { getModuleDefault } from "@metaliq/util/lib/import"

const Compressor = <unknown>getModuleDefault(CompressorModule, "Compressor") as typeof CompressorModule.default

export type PhotoFieldOptions = {
  /**
   * The maximum size (on either axis) to which the selected image will be resized for storage.
   * Defaults to 4096.
   */
  maxSize?: number

  /**
   * How should the initial selection be stored?
   * If set to "base64" a base 64 `data:` url is created and set as the field value.
   * This is useful if you wish to store the value directly into a database,
   * and will work without further processing,
   * but this can consume a lot of storage quickly.
   * If set to "blob" a `blob:` url is created and set as the field value.
   * You can then for example perform a file upload when the record is saved,
   * and reset the value to the remote URL of the uploaded file.
   */
  selectAs?: "base64" | "blob"
}

const defaultPhotoFieldOptions: PhotoFieldOptions = {
  maxSize: 4096,
  selectAs: "base64"
}

export const photoField = (options: PhotoFieldOptions = {}): MetaView<string> => (value, $) => {
  options = { ...defaultPhotoFieldOptions, ...options }

  const disabled = isDisabled($)
  return html`
    <label class="mq-field mq-photo-field ${classMap(fieldClasses($))}">
      ${fieldLabel<string>({})(value, $)}
      <i class="bi bi-camera-fill"></i>
      <input ?disabled=${disabled} type="file" accept="image/*" @change=${up(imageSelected, $)}>
      <div class="mq-photo-preview">
        ${$.value ? html`
          <img src=${$.value} alt="Preview">
        ` : ""}
      </div>
      ${$.value ? html`
        <button class="mq-field-clear" @click=${up(clearImage, $)}></button>
      ` : ""}
    </label>
    ${errorMsg({ classes: "mq-field-error" })(value, $)}
  `

  async function imageSelected ($: Meta$<string>, event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files[0]
    const compressed = await compress(file, ({ maxWidth: options.maxSize, maxHeight: options.maxSize }))
    if (options.selectAs === "base64") {
      $.value = await blobToBase64(compressed)
    } else if (options.selectAs === "blob") {
      $.value = URL.createObjectURL(compressed)
    }
  }
}

export const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(blob)
  reader.onload = () => resolve(reader.result as string)
  reader.onerror = error => reject(error)
})

const clearImage = ($: Meta$<string>) => { $.value = "" }

const compress = (file: File, options: Compressor.Options = {}): Promise<Blob> =>
  new Promise((resolve, reject) => {
    // eslint-disable-next-line no-new
    new Compressor(file, {
      ...options,
      success: resolve,
      error: reject
    })
  })
