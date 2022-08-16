import { dirname, join, extname } from "path"
import { DevServerConfig, startDevServer } from "@web/dev-server"
import mime from "mime-types"
import { copy, pathExists, remove } from "fs-extra"
import CleanCSS from "clean-css"

import { Builder, Cleaner, Runner } from "./publication"
import { SinglePageAppConfig } from "./spa"
import { page } from "./page"
import { ensureAndWriteFile } from "./util"
import { makeProdJs } from "./prod-js"
import { dedent } from "ts-dedent"

let server: { stop: () => void } // Simple typing for non-exposed DevServer type

const jsSrc = "bin/index.js" // Location for generated JS entry point in dev and src for build

export const spaRunner: Runner = async ({ specName, simplePath, spec }) => {
  const spa: SinglePageAppConfig = spec?.publication?.spa
  const port = spa?.run?.port || 8400
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
      async (ctx, next) => {
        if (ctx.path === "/bin/index.js") {
          ctx.body = indexJs(specName, simplePath)
        } else if (ctx.path === "/" || ctx.path === "/index.html") {
          const { src: cssSrc } = spa?.build?.css || { src: "css/index.css" }
          ctx.body = indexHtml(spa, jsSrc, cssSrc)
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

  return true
}

export const spaCleaner: Cleaner = async ({ spec }) => {
  const spa: SinglePageAppConfig = spec.publication?.spa
  const destDir = spa?.build?.destDir || "www"

  // Clean previous build
  await remove(destDir)
  return true
}

export const spaBuilder: Builder = async ({ specName, simplePath, spec }) => {
  const spa: SinglePageAppConfig = spec.publication?.spa

  // Deduce locations
  const destDir = spa?.build?.destDir || "www"
  const htmlDest = spa?.build?.html?.dest || "index.html"
  const jsDest = spa?.build?.js?.dest || jsSrc
  const { src: cssSrc } = spa?.build?.css || { src: "css/index.css" }
  const cssDest = spa?.build?.css?.dest || cssSrc

  // Produce HTML
  const html = indexHtml(spa, jsDest, cssDest, typeof spec.label === "string" ? spec.label : undefined)
  await ensureAndWriteFile(join(destDir, htmlDest), html)

  // Produce JS
  await ensureAndWriteFile(jsSrc, indexJs(specName, simplePath))
  const prodJsOutputs = await makeProdJs({
    src: jsSrc,
    exclude: ["electron", "./spa-node"]
  })
  await remove(jsSrc)
  for (const [i, output] of prodJsOutputs.entries()) {
    const fileName = i === 0 ? jsDest : output.fileName
    await ensureAndWriteFile(join(destDir, fileName), output.code)
  }

  // Produce CSS
  if (cssSrc) {
    const css = new CleanCSS({
      level: 0, // Mystery - why does level 1 get rid of keyframes?
      rebaseTo: dirname(cssDest)
    }).minify([cssSrc])
    await ensureAndWriteFile(join(destDir, cssDest), css.styles)
  }

  // Copy additional files
  const copies = spa?.build?.copy || []
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

const indexJs = (specName: string, specPath: string) => dedent`
  import { run } from "metaliq/lib/policies/application/application"
  import { ${specName} } from "./${specPath}.js"
  
  run(${specName})
`

const indexHtml = (spaConfig: SinglePageAppConfig, jsPath: string, cssPath?: string, title?: string) => {
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
    title: title,
    ...(spaConfig?.pageInfo || {}),
    scripts,
    styles
  })
}
