import { exec, spawn } from "child_process"
import { join } from "path"
import { promisify } from "util"

import { Command } from "commander"
import { installWindowOnGlobal } from "@lit-labs/ssr/lib/dom-shim"
import { DevServerConfig, startDevServer } from "@web/dev-server"

import { MetaSpec } from "../meta"
import { spa } from "../policies/publication/spa"
import { Logger } from "@web/dev-server-core"
import { PublicationContext, PublicationTarget } from "../policies/publication/publication"

const pExec = promisify(exec)
installWindowOnGlobal() // Shim to prevent import error in lit
Object.assign(window, { navigator: { userAgent: "" } })

const tscPath = join(".", "node_modules", ".bin", "tsc")

// Dummy logger for reordered server middleware
export const devLogger: Logger = {
  debug (...messages) {},
  error (...messages) {},
  group () {},
  groupEnd () {},
  log (...messages) {},
  logSyntaxError () {},
  warn (...messages) {}
}

type BaseOptions = {
  file?: string
}

type BuildOptions = BaseOptions

type RunOptions = BaseOptions

type ServeOptions = {
  port?: string
  index?: string
}

const program = new Command()
program
  .name("metaliq")
  .version("0.1.0")

program
  .command("run [specName]")
  .option("-f --file <file>", "Spec file location within source dir, with or without .ts extension", "specs")
  .option("-c --conf <conf>", "File location within source dir, with or without .ts extension", "policy")
  .description("Start the MetaliQ development server for the given path/spec (defaults to appSpec)")
  .action(run)

program
  .command("build [specNames...]")
  .option("-f --file <file>", "Spec file location within source dir, with or without .ts extension", "specs")
  .description("Run the build for the given spec (defaults to appSpec)")
  .action(build)

program
  .command("serve [location]")
  .option("-i --index <index>", "Alternate to index.html")
  .option("-p --port <port>", "Port to serve on", "8888")
  .description("Start a static server for the given location (useful for checking prod builds)")
  .action(serve)

program.parse()

async function run (specName: string = "appSpec", options: RunOptions = {}) {
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

  const simplePath = optionsSimplePath(options)
  const spec = await importSpec(specName, simplePath)
  if (!spec) {
    return console.error(`Specification not found: ${simplePath}.ts > ${specName}`)
  }

  const pubTarget = spec?.publication?.target || spa
  if (!pubTarget?.runner) {
    console.log("Specified publication target has no runner")
  }

  console.log(`Running specification ${specName} with publication target ${pubTarget.name}`)
  await pubTarget.runner({ specName, simplePath, spec })
}

async function build (specNames: string[], options: BuildOptions = {}) {
  if (specNames.length === 0) specNames.push("appSpec")
  console.log(`Starting MetaliQ build for ${specNames.join(", ")}`)

  await pExec(tscPath)

  type BuildBundle = { specName: string, target: PublicationTarget, context: PublicationContext }
  const bundles: BuildBundle[] = []

  // Assemble all targets
  const simplePath = optionsSimplePath(options)
  for (const specName of specNames) {
    const spec = await importSpec(specName, simplePath)
    if (!spec) {
      return console.error(`Specification not found: ${simplePath} > ${specName}`)
    }
    bundles.push({
      specName,
      target: spec.publication?.target || spa,
      context: { specName, simplePath, spec }
    })
  }

  // Clean all targets
  for (const { target, context } of bundles) {
    if (target.cleaner) {
      await target.cleaner(context)
    }
  }

  // Build all targets
  for (const { specName, target, context } of bundles) {
    if (target.builder) {
      console.log(`Building specification ${specName}`)
      await target.builder(context)
    } else {
      return console.error(`Specification ${specName} publication target ${target.name} for  has no builder`)
    }
  }

  console.log("Build completed")
}

async function serve (location: string = "", options: ServeOptions = {}) {
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

async function importSpec (name: string = "appSpec", path: string = "specs") {
  console.log(`Loading MetaliQ specification ${path} > ${name}`)
  try {
    const module = await import (join(process.cwd(), `bin/${path}.js`))
    const spec: MetaSpec<any> = module[name]
    return spec
  } catch (e) {
    console.error([
      `Problem importing spec ${path} > ${name}`,
      e.stack,
      e.message
    ].join("\n"))
    return null
  }
}

function optionsSimplePath (options: BaseOptions) {
  if (options.file?.substr(-3).match(/\.[tj]s/)) options.file = options.file.substring(0, -4)
  return options.file || "specs"
}
