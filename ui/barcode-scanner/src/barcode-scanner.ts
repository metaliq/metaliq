import { MetaFn } from "metaliq"
import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode"
import { Html5QrcodeConfigs, Html5QrcodeCameraScanConfig } from "html5-qrcode/html5-qrcode"
import { APPLICATION } from "@metaliq/application"

APPLICATION()

interface Html5QrcodeScannerConfig extends Html5QrcodeCameraScanConfig, Html5QrcodeConfigs {
  rememberLastUsedCamera?: boolean | undefined
  supportedScanTypes?: Html5QrcodeScanType[] | []
  showTorchButtonIfSupported?: boolean | undefined
  showZoomSliderIfSupported?: boolean | undefined
  defaultZoomValueIfSupported?: number | undefined
}

/**
 * Re-export the enum used to specify supported formats for scanning.
 */
export { Html5QrcodeSupportedFormats } from "html5-qrcode"

export type BarcodeScannerOptions<T, P = any> = {
  /**
   * Pass scanner config to html5-qrcode component.
   */
  config?: Partial<Html5QrcodeScannerConfig>

  /**
   * A MetaFn that returns a handler method for scan results.
   */
  onScan?: MetaFn<T, P, (code: string) => any>

  /**
   * Do not assign the latest scanned code into the associated $.value.
   */
  noBind?: boolean
}

/**
 * `html5-qrcode` does not support loading as ES module in development.
 * The workaround is to include the script:
 * `node_modules/@metaliq/barcode-scanner/node_modules/html5-qrcode/html5-qrcode.min.js`
 * in the `pageInfo.scripts` term.
 */
const Scanner: typeof Html5QrcodeScanner = (window as any).Html5QrcodeScanner

let scanner: Html5QrcodeScanner

export const barcodeScanner = <T, P = any>(options: BarcodeScannerOptions<T, P> = {}): MetaView<T> => (v, $) => {
  return html`
    ${guard([$], () => {
      // const id = `mq-barcode-scanner-${Math.ceil(Math.random() * 1000000)}`
      const id = "mq-barcode-scanner"

      setTimeout(() => {
        const resultHandler = typeof options.onScan === "function"
          ? options.onScan(v, $)
          : () => {}
        scanner = scanner || new Scanner(id, {
          fps: 10,
          ...options.config
        }, false)
        scanner.render(
          (text) => {
            $.up(() => {
              if (!options.noBind) {
                $.value = text as any
              }
              resultHandler(text)
              scanner.pause()
              setTimeout(() => {
                scanner.clear().catch(e => console.log)
              }, 1000)
            })()
          }, () => {}
        )
      }, 250)

      return html`
        <div id=${id}></div>
      `
    })}
  `
}
