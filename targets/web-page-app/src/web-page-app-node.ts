import { dirname, join, extname } from "path"
import { DevServerConfig, startDevServer } from "@web/dev-server"
import mime from "mime-types"
import { copy, pathExists, remove } from "fs-extra"
import CleanCSS from "clean-css"
import findFreePorts from "find-free-ports"
import { Builder, Cleaner, Runner } from "@metaliq/publication"
import { WebPageAppConfig } from "./web-page-app"
import { page } from "@metaliq/publication/lib/page"
import { ensureAndWriteFile } from "@metaliq/util/lib/fs"
import { makeProdJs } from "@metaliq/publication/lib/prod-js"
import { dedent } from "ts-dedent"

export { TerminologyTerms } from "@metaliq/terminology"

let server: { stop: () => void } // Simple typing for non-exposed DevServer type

const jsSrc = "bin/index.js" // Location for generated JS entry point in dev and src for build

const addBaseHref = (config: WebPageAppConfig) => {
  config.pageInfo = config.pageInfo || {}
  // Use ?? to allow passing an empty string to exclude base href
  config.pageInfo.baseHref = config.pageInfo.baseHref ?? "/"
}

export const webPageAppRunner = (
  config: WebPageAppConfig = {}
): Runner => async ({ modelName, simplePath, model }) => {
  addBaseHref(config)

  let port = config.run?.port
  if (!port) {
    const ports = await findFreePorts(1, { startPort: 8400, jobCount: 1 })
    port = ports[0]
  }
  console.log(`Starting MetaliQ SPA server on port ${port}`)

  const devServerConfig: DevServerConfig = {
    rootDir: process.cwd(),
    port,
    nodeResolve: {
      browser: true
    },
    open: true,
    watch: true,
    middleware: [
      (ctx, next) => {
        // Manually adding local version of @web/dev-server-core/dist/middleware/historyApiFallbackMiddleware
        // That module export is not expose in the `exports` of package.json for @web/dev-server-core
        // And we can't "just" enable it by configuration because there's no built-in way to get it to run
        // before the index page generation middleware
        if (ctx.method !== "GET" || extname(ctx.path)) {
          // not a GET, or a direct file request
          return next()
        }

        if (!ctx.headers || typeof ctx.headers.accept !== "string") {
          return next()
        }

        if (ctx.headers.accept.includes("application/json")) {
          return next()
        }

        if (!(ctx.headers.accept.includes("text/html") || ctx.headers.accept.includes("*/*"))) {
          return next()
        }

        if (!ctx.url.startsWith("/")) {
          return next()
        }

        ctx.url = "/index.html"
        return next()
      },
      (ctx, next) => {
        ctx.set("Access-Control-Allow-Origin", "*")
        return next()
      },
      async (ctx, next) => {
        if (ctx.path === "/bin/index.js") {
          ctx.body = indexJs(modelName, simplePath)
        } else if (ctx.path === "/" || ctx.path === "/index.html") {
          const { src: cssSrc } = config?.build?.css || { src: "css/index.css" }
          ctx.body = indexHtml(config, jsSrc, cssSrc)
        }
        ctx.type = mime.lookup(ctx.path) || ""
        return await next()
      }
    ]
  }

  if (config?.run?.hostname) devServerConfig.hostname = config?.run?.hostname

  if (server) server.stop()
  server = await startDevServer({
    config: devServerConfig,
    readCliArgs: false,
    readFileConfig: false,
    autoExitProcess: false
  })

  return true
}

export const webPageAppCleaner = (
  config: WebPageAppConfig = {}
): Cleaner => async ({ model }) => {
  const destDir = config.build?.destDir || "prod/www"

  // Clean previous build
  await remove(destDir)
  return true
}

export const webPageAppBuilder = (
  config: WebPageAppConfig = {}
): Builder => async ({ modelName, simplePath, model }) => {
  addBaseHref(config)

  // Deduce locations
  const destDir = config.build?.destDir || "prod/www"
  const htmlDest = config.build?.html?.dest || "index.html"
  const jsDest = config.build?.js?.dest || jsSrc
  const { src: cssSrc } = config.build?.css || { src: "css/index.css" }
  const cssDest = config.build?.css?.dest || cssSrc

  // Produce HTML
  const html = indexHtml(config, jsDest, cssDest, typeof model.label === "string" ? model.label : "")
  await ensureAndWriteFile(join(destDir, htmlDest), html)

  // Produce JS
  await ensureAndWriteFile(jsSrc, indexJs(modelName, simplePath))
  const prodJsOutputs = await makeProdJs({
    src: jsSrc,
    external: ["electron"]
  })
  await remove(jsSrc)
  for (const [i, output] of prodJsOutputs.entries()) {
    const fileName = i === 0 ? jsDest : output.fileName
    await ensureAndWriteFile(join(destDir, fileName), output.code)
  }

  // Produce CSS
  if (cssSrc) {
    const css = new CleanCSS({
      // Note: at one stage we set level to 0 due to a problem with missing keyframes at higher levels.
      // This was removed in order to support nested CSS.
      // If missing keyframes show up as a problem again, don't solve with a level restriction.
      rebaseTo: dirname(cssDest)
    }).minify([cssSrc])
    await ensureAndWriteFile(join(destDir, cssDest), css.styles)
  }

  // Copy additional files
  const copies = config.build?.copy || []
  const hasRes = await pathExists("res")
  if (hasRes && !copies.includes("res")) copies.push("res")
  for (const entry of copies) {
    const { src, dest }: { src: string, dest?: string } = (typeof entry === "string")
      ? { src: entry, dest: entry }
      : { src: entry.src, dest: entry.dest || entry.src }
    await copy(src, `${destDir}/${dest}`, { dereference: true })
  }

  return true
}

const indexJs = (modelName: string, modelPath: string) => dedent`
  import { run } from "@metaliq/application"
  import { renderPage } from "@metaliq/presentation"
  import { metaForm } from "@metaliq/forms"
  import { ${modelName} } from "./${modelPath}.js"
  
  async function main () {
    ${modelName}.review = ${modelName}.review || renderPage
    window.meta = await run(${modelName})
  }
  
  main()
`

const indexHtml = (spaConfig: WebPageAppConfig, jsPath: string, cssPath?: string, title?: string) => {
  // Add in the default js and css index files from the build
  const scripts = [
    ...(spaConfig?.pageInfo?.scripts || []),
    { src: jsPath, type: "module" }
  ]
  const styles = [
    ...(spaConfig?.pageInfo?.styles || []),
    cssPath
  ].filter(Boolean)

  return page({
    title,
    ...(spaConfig?.pageInfo || {}),
    scripts,
    styles
  })
}
