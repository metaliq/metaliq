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
    const { spaBuilder }: { spaBuilder: Builder } = await import (nodeModule)
    return await spaBuilder(context)
  },

  async runner (context) {
    const { spaRunner }: { spaRunner: Runner } = await import (nodeModule)
    return await spaRunner(context)
  }
}
