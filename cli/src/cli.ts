import { exec, spawn } from "child_process"
import { join } from "path"
import { promisify } from "util"

import { Command } from "commander"
import { DevServerConfig, startDevServer } from "@web/dev-server"

import { MetaModel } from "metaliq"
import { webPageApp } from "@metaliq/web-page-app"
import { PublicationContext, PublicationTarget } from "@metaliq/publication"
import { link, unlink } from "./linker"

export { ApplicationTerms } from "@metaliq/application"

const pExec = promisify(exec)

const tscPath = join(".", "node_modules", ".bin", "tsc")

type BaseOptions = {
  file?: string
}

type BuildOptions = BaseOptions

type RunOptions = BaseOptions & {
  /**
   * Additional watch layer to completely restart the runner.
   *
   * This is not necessary for publication targets such as web-page-app,
   * where the dev server takes care of reloading the browser tab on file changes,
   * but is useful for node-based targets such as graphql-server
   * to enable rapid iteration on resolvers etc. However...
   *
   * NOTE: this is a memory-leaking implementation at this time due to
   * node not giving access to mutable import cache.
   * See https://github.com/nodejs/help/issues/2806 for more.
   *
   * USE AT YOUR OWN RISK, IN DEVELOPMENT ONLY!
   */
  watch?: boolean
}

type ServeOptions = {
  port?: string
  index?: string
}

const program = new Command()
program
  .name("metaliq")
  .version("1.0.0-beta.135")

program
  .command("run [modelName]")
  .option("-f --file <file>", "MetaModel file location within source dir, with or without .ts extension", "models")
  .option("-w --watch", "Complete restart on file change - useful for node-based services such as graphql-server")
  .description("Start the MetaliQ development server for the given path/model (defaults to appModel)")
  .action(run)

program
  .command("build [modelNames...]")
  .option("-f --file <file>", "MetaModel file location within source dir, with or without .ts extension", "models")
  .description("Run the build for the given model (defaults to appModel)")
  .action(build)

program
  .command("serve [location]")
  .option("-i --index <index>", "Alternate to index.html")
  .option("-p --port <port>", "Port to serve on", "8888")
  .description("Start a static server for the given location (useful for checking prod builds)")
  .action(serve)

program
  .command("dev-local-link [path]")
  .description(
    "For MetaliQ devs - `pnpm link` all packages in a local copy of the metaliq monorepo to a client project. " +
    "Optionally specify path to metaliq, defaults to same base dir as project.")
  .action(link)

program
  .command("dev-local-unlink [path]")
  .description("For MetaliQ devs - `pnpm unlink` all packages in a local copy of the metaliq monorepo from a client project. " +
    "Optionally specify path to metaliq, defaults to same base dir as project.")
  .action(unlink)

program.parse()

export async function run (modelName: string = "appModel", options: RunOptions = {}) {
  // Initial project compilation with watch
  // Compile first in order to be able to import from bin
  await new Promise((resolve, reject) => {
    let completed = false
    const tscProcess = spawn(tscPath, ["--watch"], { shell: true, windowsHide: true })
    tscProcess.stdout.on("data", data => {
      const msg = data.toString()
      if (msg.match(/0 errors/)) {
        if (!completed) {
          console.log("Initial compilation complete")
          completed = true
          resolve(true)
        } else {
          console.log("Recompiled project code")
          if (options.watch) {
            console.log(`Restarting publication target runner for model ${modelName} after compilation`)
            loadAndStartModel().catch(e => { throw e })
          }
        }
      } else if (msg.toString().match(/Starting compilation/)) {
        console.log("Starting file watching compiler")
      } else {
        console.log(`Compiler message: ${msg}`)
      }
    })
    tscProcess.stderr.on("data", data => {
      const msg = data.toString()
      if (msg.match(/Debugger/)) {
        console.log("Running in Node DEBUG mode")
      } else {
        console.log(`Compilation Error\n${msg}`)
        completed = true
        reject(data)
      }
    })
  })

  const loadAndStartModel = async () => {
    const simplePath = optionsSimplePath(options)
    const model = await importModel(modelName, simplePath, options.watch)
    if (!model) {
      console.error(`Model not found: ${simplePath}.ts > ${modelName}`)
      return
    }

    model.publicationTarget = model.publicationTarget || webPageApp()

    if (!model.publicationTarget?.runner) {
      console.log("Specified publication target has no runner")
    }

    console.log(`Running MetaModel ${modelName} with publication target ${model.publicationTarget.name}`)
    await model.publicationTarget.runner({ modelName, simplePath, model })
  }
  await loadAndStartModel()
}

export async function build (modelNames: string[], options: BuildOptions = {}) {
  if (modelNames.length === 0) modelNames.push("appModel")
  console.log(`Starting MetaliQ build for ${modelNames.join(", ")}`)

  console.log(`Compiling project using ${tscPath}...`)
  await pExec(tscPath)

  type BuildBundle = { modelName: string, target: PublicationTarget, context: PublicationContext }
  const bundles: BuildBundle[] = []

  // Assemble all targets
  const simplePath = optionsSimplePath(options)
  for (const modelName of modelNames) {
    console.log(`Bundling modules for model ${modelName}...`)
    const model = await importModel(modelName, simplePath)
    if (!model) {
      console.error(`Model not found: ${simplePath} > ${modelName}`)
      return
    }

    bundles.push({
      modelName,
      target: model.publicationTarget || webPageApp(),
      context: { modelName, simplePath, model }
    })
  }

  // Clean all targets
  for (const { modelName, target, context } of bundles) {
    console.log(`Cleaning output for model ${modelName}...`)
    if (target.cleaner) {
      await target.cleaner(context)
    }
  }

  // Build all targets
  for (const { modelName, target, context } of bundles) {
    if (target.builder) {
      console.log(`Building MetaModel ${modelName}...`)
      await target.builder(context)
    } else {
      console.error(`Model ${modelName} publication target ${target.name} for  has no builder`)
      return
    }
  }

  console.log("Build completed")
}

export async function serve (location: string = "", options: ServeOptions = {}) {
  console.log(`Starting MetaliQ static file server for location ${location || "/"}`)
  const devServerConfig: DevServerConfig = {
    rootDir: join(process.cwd(), location),
    port: +(options.port || 8888),
    open: options.index || true,
    appIndex: options.index ? join(location, options.index) : undefined
  }

  await startDevServer({
    config: devServerConfig,
    readCliArgs: false,
    readFileConfig: false,
    autoExitProcess: false
  })
}

async function importModel (name: string = "appModel", path: string = "models", bustCache: boolean = false) {
  console.log(`Loading MetaliQ MetaModel ${path} > ${name}`)
  try {
    const module = await import (
      "file://" +
      join(process.cwd(), "bin", path) +
      (bustCache ? `.js?update=${Date.now()}` : "")
    )
    const model: MetaModel<any> = module[name]
    return model
  } catch (e) {
    console.error([
      `Problem importing model ${path} > ${name}`,
      e.stack,
      e.message
    ].join("\n"))
    return null
  }
}

function optionsSimplePath (options: BaseOptions) {
  if (options.file?.substr(-3).match(/\.[tj]s/)) options.file = options.file.substring(0, -4)
  return options.file || "models"
}
