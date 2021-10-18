import { Builder } from "../../cli/cli"
import { MetaProc } from "../../meta"

export declare namespace Publication {
  /**
   * Extend this interface within individual publication target modules to add named targets
   * and their expected configuration.
   */
  interface PublicationSpec {
    target?: PublicationTarget
  }
}

declare module "../../policy" {
  namespace Policy {
    import PublicationSpec = Publication.PublicationSpec

    interface Configuration {
      publication?: PublicationSpec
    }
    interface Specification<T, P> extends Publication.PublicationSpec {
      this?: Specification<T, P>
      publication?: PublicationSpec
    }
  }
}

/**
 * Provide the appropriate processing steps from individual publication type modules.
 */
export type PublicationTarget = {
  builder?: Builder
  runner?: MetaProc<any>
}
