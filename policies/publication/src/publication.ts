import { MetaModel } from "metaliq"

interface PublicationSpec {
  publicationTarget?: PublicationTarget
}

declare module "metaliq" {
  namespace Policy {
    interface Specification<T, P> extends PublicationSpec {
      this?: Specification<T, P>
      publicationTarget?: PublicationTarget
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
   * Cleaner function, run prior to build.
   * When performing a multi-spec build, all cleaners are run first, followed by all builders.
   * This allows for multiple specifications to provide separate content
   * to a common target directory which has been emptied or removed as part of the clean process.
   */
  cleaner?: Cleaner

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
  spec: MetaModel<any>
}

export type BuildResult = boolean
export type Builder = (context: PublicationContext) => Promise<BuildResult>

export type RunResult = boolean
export type Runner = (context: PublicationContext) => Promise<RunResult>

export type CleanResult = boolean
export type Cleaner = (context: PublicationContext) => Promise<CleanResult>
