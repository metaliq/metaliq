import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import type { Html5QrcodeScanner } from "html5-qrcode"

/**
 * `html5-qrcode` does not support loading as ES module in development.
 * The workaround is to include the script:
 * `node_modules/@metaliq/barcode-scanner/node_modules/html5-qrcode/html5-qrcode.min.js`
 * in the pageInfo.scripts term.
 */
const Scanner: typeof Html5QrcodeScanner = (window as any).Html5QrcodeScanner

export const barcodeScanner = (): MetaView<string> => (v, $) => {
  return html`
    ${guard([$], () => {
      const id = `mq-barcode-scanner-${Math.ceil(Math.random() * 1000000)}`

      setTimeout(() => {
        const scanner = new Scanner(id, {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        }, false)
        scanner.render(
          (text, result) => {
            console.log(`Result!!! ${text}`)
          }, () => {}
        )
      }, 250)

      return html`
        <div id=${id}></div>
      `
    })}
  `
}
