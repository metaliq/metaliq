// import { html } from "lit"
// import { classMap } from "lit/directives/class-map"
// import { MetaView } from "@metaliq/presentation"
// import { fieldClasses, fieldContainer, isDisabled } from "@metaliq/forms"
// import { blobToBase64, FileInputOptions } from "./file-input"
//
// export const pdfInput = (options: FileInputOptions = {}): MetaView<string> => (value, $) => {
//   const disabled = $.fn(isDisabled)
//
//   const fieldContent: MetaView<string> = (v, $) => html`
//       <i class="bi bi-camera-fill"></i>
//       <input ?disabled=${disabled} type="file" accept=".pdf" @change=${$.up(pdfSelected)}>
//       <div class="mq-photo-preview">
//         ${$.value ? html`
//           <img src=${$.value} alt="Preview">
//         ` : ""}
//       </div>
//       ${$.value ? html`
//         <button class="mq-field-clear" @click=${up(clearImage, $)}></button>
//       ` : ""}
//     </label>
//     ${errorMsg({ classes: "mq-field-error" })(value, $)}
//   `
//   return fieldContainer(fieldContent, options)
//
//   async function pdfSelected ($: Meta$<string>, event: Event) {
//     const input = event.target as HTMLInputElement
//     const file = input.files[0]
//     const compressed = await compress(file, ({ maxWidth: options.maxSize, maxHeight: options.maxSize }))
//     if (options.selectAs === "base64") {
//       $.value = await blobToBase64(compressed)
//     } else if (options.selectAs === "blob") {
//       $.value = URL.createObjectURL(compressed)
//     }
//   }
// }
//
// export const pdfInputBody = (options: FileInputOptions): MetaView<string> =>
