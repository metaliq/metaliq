import { DevServerConfig, startDevServer } from "@web/dev-server"
import mime from "mime-types"

import { Runner } from "./publication"
import { SinglePageAppConfig } from "./spa"
import dedent from "ts-dedent"
import { page } from "./page"
import { MetaSpec } from "../../meta"
import { join } from "path"

let server: { stop: () => void } // Simple typing for non-exposed DevServer type

export const runner: Runner = async ({ specName, simplePath, spec }) => {
  const spaConfig: SinglePageAppConfig = spec.publication?.spa
  const port = spaConfig?.devPort || 8400
  console.log(`Starting MetaliQ SPA server on port ${port}`)

  const devServerConfig: DevServerConfig = {
    rootDir: process.cwd(),
    port,
    nodeResolve: true,
    open: true,
    watch: true,
    appIndex: "index.html",
    middleware: [
      async (ctx, next) => {
        if (ctx.path === "/bin/app.js") {
          ctx.body = appJs(specName, simplePath)
        } else if (ctx.path === "/") {
          ctx.body = indexHtml(spaConfig)
        }
        ctx.type = mime.lookup(ctx.path) || ""
        return await next()
      }
    ]
  }

  if (server) server.stop()
  server = await startDevServer({
    config: devServerConfig,
    readCliArgs: false,
    readFileConfig: false,
    autoExitProcess: false
  })

  // TODO: Serve app.js and index.html from metaliq cli
  return true
}

export function build (spec: MetaSpec<any>) {
  const somePath = join("one", "two")
  console.log(`Building ${spec.label} with path: ${somePath}`)
}

const appJs = (specName: string, specPath: string) => dedent`
  import { run } from "metaliq/lib/policies/application/application"
  import { ${specName} } from "./${specPath}.js"
  
  run(${specName})
`

const indexHtml = (spaConfig: SinglePageAppConfig) => page({
  ...(spaConfig?.pageInfo || {}),
  scripts: [
    ...(spaConfig.pageInfo?.scripts || []),
    { src: "bin/app.js", type: "module" }
  ]
})
