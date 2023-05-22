import * as pdfjsLibModule from "pdfjs-dist"
import * as pdfjsViewerModule from "pdfjs-dist/web/pdf_viewer"
import { MetaView } from "@metaliq/presentation"
import { FieldOptions } from "@metaliq/forms"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { PDFViewerOptions } from "pdfjs-dist/types/web/pdf_viewer"

export { pdfjsLibModule, pdfjsViewerModule }

const pdfjsLib: typeof pdfjsLibModule = (window as any).pdfjsLib
const pdfjsViewer: typeof pdfjsViewerModule = (window as any).pdfjsViewer

/**
 * The worker lib cannot be imported due to a lack of types.
 * The file:
 * `node_modules/@metaliq/media/node_modules/pdfjs-dist/build/pdf.worker.js`
 * must be added to the web page app config in both `pageInfo.scripts` and `build.copy`.
 */
Object.assign(pdfjsLib?.GlobalWorkerOptions || {}, { workerSrc: (window as any).pdfjsWorker })

export const pdfViewer = (options: FieldOptions<any> = {}): MetaView<string> => (v, $) => {
  return html`
    ${guard(v, () => {
      const id = Math.ceil(Math.random() * 999999)
      const containerId = `pdf-container-${id}`
      const viewerId = `pdf-viewer-${id}`

      if (!v) return ""
      void pdfjsLib.getDocument(v).promise.then(pdf => {
        const viewer = new pdfjsViewer.PDFViewer({
          container: document.querySelector(`#${containerId}`),
          viewer: document.querySelector(`#${viewerId}`)
        } as PDFViewerOptions)
        viewer.setDocument(pdf)
      })
      return html`
        <div style="position: relative;">
          <div id=${containerId} style="position: absolute;">
            <div id=${viewerId}></div>
          </div>
        </div>
      `
    })}
  `
}
