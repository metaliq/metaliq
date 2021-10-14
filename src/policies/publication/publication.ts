import { MetaMorph, MetaSpec, MetaStateMaker } from "../../meta"

export interface PublicationSpec {
  publication?: Publication.TargetConfigs
}

declare module "../../policy" {
  namespace Policy {
    interface Configuration extends PublicationSpec {}
    interface Specification<T, P> extends PublicationSpec { this?: Specification<T, P> }
  }
}

export declare namespace Publication {
  /**
   * Extend this interface within individual target modules to add named targets
   * and their expected configuration.
   */
  interface TargetConfigs {
    nothing?: {}
  }
}

/**
 * Add an entry to PublicationTargets from within individual target modules to provide
 * the processing associated with that target.
 */
export const publicationTargets: { [name: string]: PublicationTarget } = {}

export type PublicationTarget = {

  /**
   * Build process for this publication target.
   */
  builder?: Builder

  /**
   * Runtime initialiser for top-level Meta object for this target.
   */
  initTopMetaState?: MetaStateMaker<any>

  /**
   * Runtime post-start hook for this target.
   */
  postStart?: MetaMorph<any>
}

export type BuildResult = boolean
export type Builder = (spec: MetaSpec<any>, policyConfig: PublicationSpec) => Promise<BuildResult>

export async function build (spec: MetaSpec<any>, policyConfig: PublicationSpec = {}) {
  for (const targetName of Object.keys(spec.publication)) {
    const target = publicationTargets[targetName]
    const builder = target?.builder
    if (builder) {
      await builder(spec, policyConfig)
    }
  }
}
