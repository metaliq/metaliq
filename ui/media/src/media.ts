import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { ifDefined } from "lit/directives/if-defined.js"
import { MetaFn } from "metaliq"
import { fieldContainer, FieldOptions, isDisabled } from "@metaliq/forms"
import * as CompressorModule from "compressorjs"
import { getModuleDefault } from "@metaliq/util/lib/import"
import { APPLICATION } from "@metaliq/application"

export * from "./pdf-viewer"

APPLICATION()

const Compressor = <unknown>getModuleDefault(CompressorModule, "Compressor") as typeof CompressorModule.default

export const object: MetaView<string> = (v, $) => html`
  <object data=${$.value}>
    <a href="#" target="_blank" @click=${() => window.open($.value, "_blank")}>Open in New Tab</a>
  </object>
`

export const iframe: MetaView<string> = (v, $) => html`
  <iframe src=${$.value}></iframe>
`

export type FileInputOptions = FieldOptions<any> & {
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
   * A class string for the icon element within the field.
   * This defaults to the bootstrap-icons camera icon,
   * which requires the relevant library CSS file to be loaded.
   * // TODO: Make this a general FieldOption.
   */
  icon?: string
}

export const defaultFileInputOptions: FileInputOptions = {
  type: "file-input",
  icon: "bi cloud-arrow-up",
  format: "base64"
}

export const fileInput = (options: FileInputOptions): MetaView<string> => (v, $) => {
  options = { ...defaultFileInputOptions, ...options }

  const disabled = $.fn(isDisabled)

  const fileSelected: MetaFn<string> = async (v, $, event) => {
    const input = event.target as HTMLInputElement
    let blob: Blob = input.files[0]
    if (blob.type === "image" && options.compressImageTo) {
      blob = await compress(blob as File, ({
        maxWidth: options.compressImageTo,
        maxHeight: options.compressImageTo
      }))
    }
    if (options.format === "base64") {
      $.value = await blobToBase64(blob)
    } else if (options.format === "blob") {
      $.value = URL.createObjectURL(blob)
    }
    input.value = ""
  }

  return html`
  <i class=${options.icon}></i>
  <input type="file" 
    accept=${ifDefined(options.accept)}
    ?disabled=${disabled} 
    @change=${$.up(fileSelected)} 
  />
  ${$.value && !disabled ? html`
    <button class="mq-field-clear" @click=${$.up(clearValue)}></button>
  ` : ""}
`
}

export const fileInputField = (options: FileInputOptions) => {
  options = { ...defaultFileInputOptions, ...options }
  return fieldContainer(options)(fileInput(options))
}

export const imageInputField = (options: FileInputOptions) => {
  options = {
    ...defaultFileInputOptions,
    accept: "image/*",
    compressImageTo: 4096,
    format: "base64",
    icon: "bi bi-camera-fill",
    ...options
  }
  return fieldContainer(options)((v, $) => [
    fileInput(options)(v, $),
    v ? html`<div class="mq-media-preview">
      <img src=${$.value} alt="Image Preview">
    </div>` : ""
  ])
}

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
