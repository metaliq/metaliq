import { DevServerConfig, startDevServer } from "@web/dev-server"
import mime from "mime-types"

import { Runner } from "./publication"
import { appJs, combineConfigs, indexHtml, SinglePageAppConfig } from "./spa"

let server: { stop: () => void } // Simple typing for non-exposed DevServer type

export const runner: Runner = async ({ specName, simplePath, spec, config }) => {
  const spaConfig: SinglePageAppConfig = combineConfigs(spec, config)
  console.log(`Starting MetaliQ SPA server on port ${spaConfig.devPort}`)

  const devServerConfig: DevServerConfig = {
    rootDir: process.cwd(),
    port: spaConfig.devPort,
    nodeResolve: true,
    open: true,
    watch: true,
    appIndex: "index.html",
    middleware: [
      async (ctx, next) => {
        console.log(ctx.path)
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
