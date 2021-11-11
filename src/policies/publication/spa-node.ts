import { dirname, join } from "path"
import { DevServerConfig, startDevServer } from "@web/dev-server"
import mime from "mime-types"
import { copy, remove, pathExists } from "fs-extra"
import CleanCSS from "clean-css"
import { historyApiFallbackMiddleware } from "@web/dev-server-core/dist/middleware/historyApiFallbackMiddleware"

import { Builder, Runner } from "./publication"
import { SinglePageAppConfig } from "./spa"
import dedent from "ts-dedent"
import { rollup } from "rollup"
import ignore from "rollup-plugin-ignore"
import nodeResolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import minifyHTMLLiterals from "rollup-plugin-minify-html-literals"
import { defaultShouldMinify } from "minify-html-literals"
import { minify } from "terser"
import { page } from "./page"
import { ensureAndWriteFile } from "./util"
import { devLogger } from "../../cli/cli"

let server: { stop: () => void } // Simple typing for non-exposed DevServer type

const jsSrc = "bin/index.js" // Location for generated JS entry point in dev and src for build

export const spaRunner: Runner = async ({ specName, simplePath, spec }) => {
  const spa: SinglePageAppConfig = spec?.publication?.spa
  const port = spa?.run?.port || 8400
  console.log(`Starting MetaliQ SPA server on port ${port}`)

  const devServerConfig: DevServerConfig = {
    rootDir: process.cwd(),
    port,
    nodeResolve: true,
    open: true,
    watch: true,
    middleware: [
      // Manually adding historyApiFallback instead of setting appIndex so it runs prior to index page middleware
      historyApiFallbackMiddleware("/index.html", "/", devLogger),
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

export const spaBuilder: Builder = async ({ specName, simplePath, spec }) => {
  const spa: SinglePageAppConfig = spec.publication?.spa

  // Deduce locations
  const destDir = spa?.build?.destDir || "www"
  const htmlDest = spa?.build?.html?.dest || "index.html"
  const jsDest = spa?.build?.js?.dest || jsSrc
  const { src: cssSrc } = spa?.build?.css || { src: "css/index.css" }
  const cssDest = spa?.build?.css?.dest || cssSrc

  // Clean previous build
  await remove(destDir)

  // Produce HTML
  const html = indexHtml(spa, jsDest, cssDest)
  await ensureAndWriteFile(join(destDir, htmlDest), html)

  // Produce JS
  await ensureAndWriteFile(jsSrc, indexJs(specName, simplePath))
  const js = await makeProdJs(jsSrc)
  await remove(jsSrc)
  await ensureAndWriteFile(join(destDir, jsDest), js)

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

const indexHtml = (spaConfig: SinglePageAppConfig, jsPath: string, cssPath?: string) => {
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
    ...(spaConfig?.pageInfo || {}),
    scripts,
    styles
  })
}

/**
 * Provide an optimised bundle for the given entry point.
 * Includes module bundling and minification of JS and embedded lit HTML templates.
 */
const makeProdJs = async (src: string) => {
  // Bundle all JS modules
  const bundler = await rollup({
    input: src,
    plugins: [
      ignore(["electron", "./spa-node"], { commonjsBugFix: true }),
      nodeResolve(),
      commonjs(),
      minifyHTMLLiterals({
        options: {
          shouldMinify (template) {
            return defaultShouldMinify(template) || template.tag === "svg"
          }
        }
      })
    ]
  })
  const bundledJs = await bundler.generate({ format: "esm" })

  // Minify JS, including embedded HTML and SVG template literals
  const minJsResult = await minify(bundledJs.output[0].code, {
    output: {
      comments: false
    }
  })

  return minJsResult.code
}
