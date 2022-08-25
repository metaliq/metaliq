import { MetaSpec } from "metaliq"

export declare namespace Publication {
  /**
   * Extend this interface within individual publication target modules to add named targets
   * and their expected configuration.
   */
  interface PublicationSpec {
    target?: PublicationTarget
  }
}

declare module "metaliq/lib/policy" {
  namespace Policy {
    interface Specification<T, P> {
      this?: Specification<T, P>
      publication?: Publication.PublicationSpec
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
  spec: MetaSpec<any>
}

export type BuildResult = boolean
export type Builder = (context: PublicationContext) => Promise<BuildResult>

export type RunResult = boolean
export type Runner = (context: PublicationContext) => Promise<RunResult>

export type CleanResult = boolean
export type Cleaner = (context: PublicationContext) => Promise<CleanResult>
