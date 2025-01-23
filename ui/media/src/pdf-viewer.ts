import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { fieldContainer } from "@metaliq/forms"
import { defaultFileInputOptions, fileInput, FileInputOptions } from "./media"

export type Fetch = (url: RequestInfo, init?: RequestInit) => Promise<Response>

export type PdfViewerOptions = {
  fetch?: Fetch
}

export const pdfViewer = (options: PdfViewerOptions = {}): MetaView<string> => $ => html`
  ${guard($.value, () => {
    const id = Math.ceil(Math.random() * 999999)
    const viewerId = "mq-pdf-viewer-" + id.toString()

    if ($.value) {
      setTimeout(() => {
        makeBlobUrl($.value, options)
          .then(blobUrl => {
            const iframe: HTMLIFrameElement = document.querySelector(`#${viewerId}`)
            iframe.src = `node_modules/@metaliq/media/res/pdf-viewer/viewer.html?file=${blobUrl}`
          })
          .catch(e => {
            throw e
          })
      }, 20)
    }

    return html`
      <iframe class="mq-pdf-viewer" id=${viewerId}></iframe>
    `
  })}
`

export const pdfInputField = (options: FileInputOptions & PdfViewerOptions = {}) => {
  options = {
    ...defaultFileInputOptions,
    accept: ".pdf",
    icon: "bi bi-file-pdf",
    ...options
  }
  return fieldContainer(options)($ => [
    fileInput(options)($),
    $.value ? pdfViewer(options)($) : ""
  ])
}

/**
 * Turn any URL (e.g. remote HTTP or Base64 encoded data URL) into a blob object URL.
 */
export const makeBlobUrl = async (url: string, options: PdfViewerOptions) => {
  const fetch: Fetch = options.fetch || window.fetch.bind(window)

  if (url.match(/^blob/)) return url
  else {
    const response = await fetch(url)
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }
}
