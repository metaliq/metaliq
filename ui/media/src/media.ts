import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { MetaFn } from "metaliq"
import { fieldContainer, FieldOptions, isDisabled } from "@metaliq/forms"
import * as CompressorModule from "compressorjs"
import { getModuleDefault } from "@metaliq/util/lib/import"
import { APPLICATION } from "@metaliq/application"

APPLICATION()

const Compressor = <unknown>getModuleDefault(CompressorModule, "Compressor") as typeof CompressorModule.default

export type MediaFieldOptions = FieldOptions<any> & {
  /**
   * What type of media does this field accept?
   * This should be set to a valid value for the HTML accept attribute.
   * Defaults to "image/*".
   */
  accept?: string

  /**
   * This is only relevant for image media types.
   * The maximum size (on either axis) to which a selected image will be resized for storage.
   * Defaults to 4096.
   * Set this to 0 (or undefined) to turn off image compression.
   */
  compressImageTo?: number

  /**
   * How should the initial selection be stored?
   * If set to "base64" (the default) a base 64 `data:` url is created and set as the field value.
   * This is useful if you wish to store the value directly into a database,
   * and will work without further processing,
   * but this can consume a lot of storage quickly.
   * If set to "blob" a `blob:` url is created and set as the field value.
   * You can then for example perform a file upload when the record is saved,
   * and reset the value to the remote URL of the uploaded file.
   */
  format?: "base64" | "blob"

  /**
   * Indicate whether to display a preview of the selected media.
   * This defaults to `true` and works well for images, PDFs etc.
   * but may not be applicable to other file types,
   * in which case it should be set to `false`.
   */
  preview?: boolean

  /**
   * A class string for the icon element within the field.
   * This defaults to the bootstrap-icons camera icon,
   * which requires the relevant library CSS file to be loaded.
   */
  icon?: string
}

const defaultMediaFieldOptions: MediaFieldOptions = {
  type: "media",
  accept: "image/*",
  compressImageTo: 4096,
  format: "base64",
  preview: true,
  icon: "bi bi-camera-fill"
}

export const mediaField = (options: MediaFieldOptions = {}): MetaView<string> => fieldContainer((value, $) => {
  options = { ...defaultMediaFieldOptions, ...options }

  const mediaSelected: MetaFn<string> = async (v, $, event) => {
    const input = event.target as HTMLInputElement
    let blob: Blob = input.files[0]
    if (blob.type === "image" && options.compressImageTo) {
      blob = await compress(blob as File, ({ maxWidth: options.compressImageTo, maxHeight: options.compressImageTo }))
    }
    if (options.format === "base64") {
      $.value = await blobToBase64(blob)
    } else if (options.format === "blob") {
      $.value = URL.createObjectURL(blob)
    }
    input.value = ""
  }

  const disabled = $.fn(isDisabled)
  return html`
    <i class=${options.icon}></i>
      <input ?disabled=${disabled} type="file" accept=${options.accept} @change=${$.up(mediaSelected)}>
      ${$.value && options.preview ? html`
        <div class="mq-media-preview">
          <object data=${$.value}>
            <a href="#" target="_blank" @click=${() => window.open($.value, "_blank")}>View</a>
          </object>
        </div>
      ` : ""}
      ${$.value && !disabled ? html`
        <button class="mq-field-clear" @click=${$.up(clearValue)}></button>
      ` : ""}
  `
}, { ...defaultMediaFieldOptions, ...options })

export const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(blob)
  reader.onload = () => {
    resolve(reader.result as string)
  }
  reader.onerror = error => {
    reject(error)
  }
})

const clearValue: MetaFn<string> = (v, $) => { $.value = "" }

const compress = (file: File, options: Compressor.Options = {}): Promise<Blob> =>
  new Promise((resolve, reject) => {
    // eslint-disable-next-line no-new
    new Compressor(file, {
      ...options,
      success: resolve,
      error: reject
    })
  })
