import { PageScript } from "./page"

export interface PublicationConfig {
  scripts?: PageScript[]
  styles?: string[]
}

declare module "../../policy" {
  namespace Policy {
    interface Configuration extends PublicationConfig {}
  }
}
