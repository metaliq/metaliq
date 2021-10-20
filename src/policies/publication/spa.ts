import { PageInfo } from "./page"
import { PublicationTarget } from "./publication"

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

export const spa: PublicationTarget = {
  name: "Single Page Application",

  async builder ({ specName, simplePath, spec }) {
    const { build } = await import ("./spa-node.js")
    build(spec)
    return true
  },

  async runner (context) {
    const { runner } = await import ("./spa-node.js")
    return await runner(context)
  }
}
