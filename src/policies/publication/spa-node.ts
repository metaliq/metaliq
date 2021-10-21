import { DevServerConfig, startDevServer } from "@web/dev-server"
import mime from "mime-types"
import { writeFile, remove, copy } from "fs-extra"
import { rollup } from "rollup"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import commonJs from "@rollup/plugin-commonjs"
import ignore from "rollup-plugin-ignore"
import { minify as minifyJs } from "terser"
import minifyHTMLLiterals from "rollup-plugin-minify-html-literals"
import { defaultShouldMinify } from "minify-html-literals"
import CleanCSS from "clean-css"
import { Logger } from "@web/dev-server-core"
import { historyApiFallbackMiddleware } from "@web/dev-server-core/dist/middleware/historyApiFallbackMiddleware"

import { Builder, Runner } from "./publication"
import { SinglePageAppConfig } from "./spa"
import dedent from "ts-dedent"
import { page } from "./page"
import { ensureAndWriteFile } from "./util"

let server: { stop: () => void } // Simple typing for non-exposed DevServer type

// Dummy logger for reordered server middleware
const logger: Logger = {
  debug (...messages) {},
  error (...messages) {},
  group () {},
  groupEnd () {},
  log (...messages) {},
  logSyntaxError () {},
  warn (...messages) {}
}

export const spaRunner: Runner = async ({ specName, simplePath, spec }) => {
  const spaConfig: SinglePageAppConfig = spec.publication?.spa
  const port = spaConfig?.devPort || 8400
  console.log(`Starting MetaliQ SPA server on port ${port}`)

  const devServerConfig: DevServerConfig = {
    rootDir: process.cwd(),
    port,
    nodeResolve: true,
    open: true,
    watch: true,
    middleware: [
      // Manually adding historyApiFallback instead of setting appIndex so it runs prior to index page middleware
      historyApiFallbackMiddleware("/index.html", "/", logger),
      async (ctx, next) => {
        if (ctx.path === "/bin/app.js") {
          ctx.body = appJs(specName, simplePath)
        } else if (ctx.path === "/" || ctx.path === "/index.html") {
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

export const spaBuilder: Builder = async ({ specName, simplePath, spec }) => {
  const spaConfig: SinglePageAppConfig = spec.publication?.spa
  const outDir = "./www" // TODO: Make output base directory configurable

  // Clean previous build
  await remove(outDir)
  const html = indexHtml(spaConfig)
  await writeFile("bin/app.js", appJs(specName, simplePath))
  const js = await makeProdJs("bin/app.js")
  const css = new CleanCSS({
    level: 0, // Mystery - why does level 1 get rid of keyframes?
    rebaseTo: "css" // TODO: Figure out rebasing based off: 1) configurable CSS output, 2) configurable base href
  }).minify(["./css/index.css"]) // TODO: Make CSS input file configurable

  await ensureAndWriteFile(`${outDir}/prod.html`, html) // TODO: Make HTML output path configurable
  await ensureAndWriteFile(`${outDir}/bin/app.js`, js) // TODO: Make JS output path configurable
  await ensureAndWriteFile(`${outDir}/css/index.css`, css.styles) // TODO: Make CSS output path configurable

  for (const file of [ // TODO: Make included files input and output paths configurable
    "img",
    "node_modules/bootstrap-icons"
  ]) {
    await copy(file, `${outDir}/${file}`, { dereference: true })
  }

  return true
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
    { src: "bin/app.js", type: "module" } // TODO: Make JS output location configurable
  ],
  baseHref: "/" // TODO: Make base href output location configurable
})

/**
 * Provide an optimised bundle for the given entry point.
 * Includes module bundling and minification of JS and embedded lit HTML templates.
 */
const makeProdJs = async (input: string) => {
  // Bundle all JS modules
  const bundler = await rollup({
    input,
    plugins: [
      ignore(["electron", "./spa-node"], { commonjsBugFix: true }),
      nodeResolve(),
      commonJs(),
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
  const minJsResult = await minifyJs(bundledJs.output[0].code, {
    output: {
      comments: false
    }
  })

  return minJsResult.code
}
