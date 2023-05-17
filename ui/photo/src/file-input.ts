// import { fieldContainer, FieldOptions, isDisabled } from "@metaliq/forms"
// import { MetaView } from "@metaliq/presentation"
// import { html } from "lit"
// import { ifDefined } from "lit/directives/if-defined"
// import { MetaFn } from "metaliq"
//
// export type FileInputOptions = FieldOptions<string> & {
//   /**
//    * How should the initial selection be stored?
//    * If set to "base64" a base 64 `data:` url is created and set as the field value.
//    * This is useful if you wish to store the value directly into a database,
//    * and will work without further processing,
//    * but this can consume a lot of storage quickly.
//    * If set to "blob" a `blob:` url is created and set as the field value.
//    * You can then for example perform a file upload when the record is saved,
//    * and reset the value to the remote URL of the uploaded file.
//    */
//   selectAs?: "base64" | "blob"
//
//   /**
//    * Will be passed as `accept` attribute on the file input element.
//    * Variants such as the pdf and image inputs set this by default,
//    * but you can override it if necessary.
//    */
//   accept?: string
//
//   /**
//    * Data processing to be performed once the data value has been assigned.
//    */
//   onSelected?: MetaFn<string>
// }
//
// export const fileInput = (options: FileInputOptions): MetaView<string> => fieldContainer(fileInputBody({
//   onSelected: (v, $, event) => {
//     setFileValue(options, eventFile(event))
//   },
//   ...options
// }))
//
// export const fileInputBody = (options: FileInputOptions = {}): MetaView<string> => (v, $) => html`
//   <input ?disabled=${$.fn(isDisabled)} type="file" accept=${ifDefined(options.accept)} @change=${$.up(options.onSelected)}>
//   ${$.fn(clearButton)}
// `
//
// export const clearButton: MetaView<string> = (v, $) => $.value
//   ? html`
//     <button class="mq-field-clear" @click=${$.up(() => $.value = "")}></button>
//   ` : ""
//
// export const eventFile = (event: Event) => {
//   const input = event.target as HTMLInputElement
//   return input.files[0]
// }
//
// /**
//  * Set the associated data value to the given blob, formatted as base64 if specified in options.
//  * A File object is a valid Blob, but could also be pre-processed (e.g. compressed) before calling.
//  */
// export const setFileValue = (options: FileInputOptions, blob: Blob): MetaFn<string> => async (v, $) => {
//   if (options.selectAs === "base64") {
//     $.value = await blobToBase64(blob)
//   } else if (options.selectAs === "blob") {
//     $.value = URL.createObjectURL(blob)
//   }
// }

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
