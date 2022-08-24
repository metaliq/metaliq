import { ModuleFormat, OutputChunk, rollup } from "rollup"
import ignore from "rollup-plugin-ignore"
import nodeResolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import pluginJson from "@rollup/plugin-json"
import minifyHTMLLiteralsModule from "rollup-plugin-minify-html-literals"
import { defaultShouldMinify } from "minify-html-literals"
import { minify } from "terser"
import { getModuleDefault } from "../../util/import"

// Workaround for named `default` export in rollup-plugin-minify-html-literals
const minifyHTMLLiterals = getModuleDefault(minifyHTMLLiteralsModule)

export type ProdJsOptions = {
  src: string
  exclude?: string[]
  external?: string[]
  format?: ModuleFormat
}

export type ProdJsOutput = {
  fileName: string
  code: string
}

/**
 * Provide an optimised bundle for the given entry point.
 * Includes module bundling and minification of JS and embedded lit HTML templates.
 */
export const makeProdJs = async ({ src, exclude = [], external = [], format = "es" }: ProdJsOptions) => {
  // Bundle all JS modules
  const bundler = await rollup({
    input: src,
    external,
    plugins: [
      ignore(exclude, { commonjsBugFix: true }),
      nodeResolve(),
      commonjs(),
      pluginJson(),
      minifyHTMLLiterals({
        options: {
          shouldMinify (template) {
            return defaultShouldMinify(template) || template.tag === "svg"
          }
        }
      })
    ]
  })
  const bundle = await bundler.generate({
    format
  })

  const outputs: ProdJsOutput[] = []

  for (const bundleOutput of bundle.output) {
    const chunk = bundleOutput as OutputChunk
    // Minify JS, including embedded HTML and SVG template literals
    const minJs = await minify(chunk.code, {
      output: {
        comments: false
      }
    })
    outputs.push({
      fileName: chunk.fileName,
      code: minJs.code
    })
  }

  return outputs
}