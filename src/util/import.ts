export const isNode = typeof process !== "undefined" && process?.versions?.node !== "undefined"

/**
 * Handle modules that say they have a default export, but actually they don't.
 * Some modules do different things depending on whether they
 * are loaded directly by the browser, bundled by rollup or imported in Node.
 * Generally these modules are claiming to export a function.
 * This process checks various ways of getting to the actual export,
 * or uses a fallback name they may have attached to the window object.
 *
 * Try using `import * as x from "x"` and then passing x to this function.
 */
export const getModuleDefault = <T>(module: T, windowName?: string): T => {
  if (typeof module === "function") {
    // The main module export is actually the desired function.
    return module
  } else {
    // Try the `default` key on the export
    const def = (<any>module).default
    if (typeof def === "function") {
      return def
    } else if (typeof window !== "undefined") {
      // Fall back to a name the module has attached to the window object.
      // E.g. dayjs does this, when not bundled.
      return (<any>window)[windowName]
    }
  }
}

export function addScript (src: string) {
  if (document?.head?.appendChild) {
    const scriptEl = document.createElement("script")
    scriptEl.src = src
    document.head.appendChild(scriptEl)
  }
}
