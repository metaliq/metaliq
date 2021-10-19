import { page, PageInfo } from "./page"
import { PublicationTarget } from "./publication"
import { MetaSpec } from "../../meta"
import { Policy } from "../../policy"
import dedent from "dedent"

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

  async builder ({ specName, simplePath, spec, config }) {
    const { build } = await import ("./spa-build.js")
    build(spec)
    return true
  },

  async runner (context) {
    const { runner } = await import ("./spa-run.js")
    return await runner(context)
  }
}

/**
 * Combine SPA configurations from project config and spec.
 */
export function combineConfigs (spec: MetaSpec<any>, config: Policy.Configuration): SinglePageAppConfig {
  const projectSpaConfig: SinglePageAppConfig = config.publication?.spa || {}
  const specSpaConfig: SinglePageAppConfig = spec.publication?.spa || {}
  // TODO: Utility method for doing config merging, with default behaviour of additive arrays
  return {
    ...defaultSpaConfig,
    ...projectSpaConfig,
    ...specSpaConfig,
    pageInfo: {
      ...(defaultSpaConfig.pageInfo || {}),
      ...(projectSpaConfig.pageInfo || {}),
      ...(specSpaConfig.pageInfo || {}),
      scripts: [
        ...(defaultSpaConfig.pageInfo?.scripts || []),
        ...(projectSpaConfig.pageInfo?.scripts || []),
        ...(specSpaConfig.pageInfo?.scripts || [])
      ],
      styles: [
        ...(defaultSpaConfig.pageInfo?.styles || []),
        ...(projectSpaConfig.pageInfo?.styles || []),
        ...(specSpaConfig.pageInfo?.styles || [])
      ]
    }
  }
}

export const appJs = (specName: string, simplePath: string) => dedent`
  import { run } from "metaliq/lib/policies/application/application"
  import { ${specName} } from "./${simplePath}.js"
  
  run(${specName})
`

export const indexHtml = (spaConfig: SinglePageAppConfig) => page({
  ...spaConfig.pageInfo,
  scripts: [
    ...(spaConfig.pageInfo.scripts || []),
    { src: "bin/app.js", type: "module" }
  ]
})
