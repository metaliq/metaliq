import { PageInfo } from "./page"
import { Builder, PublicationTarget, Runner } from "./publication"

declare module "./publication" {
  namespace Publication {
    interface PublicationSpec {
      spa?: SinglePageAppConfig
    }
  }
}

export type SinglePageAppConfig = {
  devPort?: number
  prod?: boolean
  srcMap?: boolean
  pageInfo?: PageInfo
}

export const defaultSpaConfig: SinglePageAppConfig = {
  devPort: 8900,
  prod: true,
  srcMap: false,
  pageInfo: {}
}

const nodeModule = "./spa-node.js"

export const spa: PublicationTarget = {
  name: "Single Page Application",

  async builder (context) {
    const { builder }: { builder: Builder } = await import (nodeModule)
    return await builder(context)
  },

  async runner (context) {
    const { runner }: { runner: Runner } = await import (nodeModule)
    return await runner(context)
  }
}
