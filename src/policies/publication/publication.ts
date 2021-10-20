import { MetaSpec } from "../../meta"

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

  /**
   * User-friendly name for this publication target.
   */
  name: string

  /**
   * Run function.
   */
  runner?: Runner

  /**
   * Build function.
   */
  builder?: Builder
}

/**
 * The initiation context for a publication, with project location and loaded instance of the spec and config.
 */
export type PublicationContext = {

  /**
   * Spec name as exported from its module.
   */
  specName: string

  /**
   * Path within the source folder, without extension.
   */
  simplePath: string

  /**
   * Loaded spec.
   */
  spec: MetaSpec<any>
}

export type BuildResult = boolean
export type Builder = (context: PublicationContext) => Promise<BuildResult>

export type RunResult = boolean
export type Runner = (context: PublicationContext) => Promise<RunResult>
