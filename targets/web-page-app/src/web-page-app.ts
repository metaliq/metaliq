import { PageInfo } from "@metaliq/publication/lib/page"
import { Builder, Cleaner, PublicationTarget, Runner } from "@metaliq/publication"

type CopyEntry = string | {
  src: string // Within project dir.
  dest?: string // Within destDir. Defaults to same as src
}

export type WebPageAppConfig = {
  /**
   * Details for the development runtime.
   */
  run?: {
    port?: number // Defaults to 8900
  }

  /**
   * Details for the production build.
   */
  build?: {
    destDir?: string // Defaults to prod/www
    html?: {
      dest?: string // Within destDir. Defaults to index.html.
    }
    js?: {
      dest?: string // Within destDir. Defaults to bin/index.js (same as generated file runtime entry point)
    }
    css?: {
      src?: string // Within project dir. Defaults to css/index.css. Set blank to do no style compilation
      dest?: string // Within destDir. Defaults to same as src.
    }
    copy?: CopyEntry[] // Files to copy into destination. If a folder called "res" exists, it will be copied by default.
  }

  /**
   * Details of additional page resources and properties.
   * No need to specify main JS or the CSS specified in build.
   */
  pageInfo?: PageInfo
}

const nodeModule = "./web-page-app-node.js"

export const webPageApp = (config: WebPageAppConfig = {}): PublicationTarget => ({
  name: "Single Page Application",

  /**
   * A wrapper around a dynamically imported runner, in order that Node packages are not linked in a browser context
   */
  async runner (context) {
    const { webPageAppRunner }: {
      webPageAppRunner: (config: WebPageAppConfig) => Runner
    } = await import (nodeModule)
    return await webPageAppRunner(config)(context)
  },

  /**
   * A wrapper around a dynamically imported cleaner, in order that Node packages are not linked in a browser context
   */
  async cleaner (context) {
    const { webPageAppCleaner }: {
      webPageAppCleaner: (config: WebPageAppConfig) => Cleaner
    } = await import (nodeModule)
    return await webPageAppCleaner(config)(context)
  },

  /**
   * A wrapper around a dynamically imported builder, in order that Node packages are not linked in a browser context
   */
  async builder (context) {
    const { webPageAppBuilder }: {
      webPageAppBuilder: (config: WebPageAppConfig) => Builder
    } = await import (nodeModule)
    return await webPageAppBuilder(config)(context)
  }
})
