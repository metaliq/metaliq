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
  prod?: boolean
  srcMap?: boolean
  pageInfo?: PageInfo
}

export const spa: PublicationTarget = {
  async builder (spec) {
    const { build } = await import ("./spa-build.js")
    build(spec)
    return true
  }
}
