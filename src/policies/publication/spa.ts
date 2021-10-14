import { PageInfo } from "./page"

export type SinglePageAppConfig = {
  prod?: boolean
  srcMap?: boolean
  pageInfo?: PageInfo
}

declare module "./publication" {
  namespace Publication {
    interface TargetConfigs {
      spa?: SinglePageAppConfig
    }
  }
}
