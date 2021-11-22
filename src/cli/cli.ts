import { exec, spawn } from "child_process"
import { join } from "path"
import { promisify } from "util"

import { Command } from "commander"
import { installWindowOnGlobal } from "@lit-labs/ssr/lib/dom-shim"
import { DevServerConfig, startDevServer } from "@web/dev-server"

import { MetaSpec } from "../meta"
import { spa } from "../policies/publication/spa"
import { Logger } from "@web/dev-server-core"

const pExec = promisify(exec)
installWindowOnGlobal() // Shim to prevent import error in lit

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
  .command("build [specName]")
  .option("-f --file <file>", "File location within source dir, with or without .ts extension", "specs")
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
  const spec = await importSpec(specName)

  const pubTarget = spec?.publication?.target || spa
  if (!pubTarget?.runner) {
    console.log("Missing publication target runtime")
  } else {
    console.log(`Running specification with publication target ${pubTarget.name}`)
    await pubTarget.runner({ specName, simplePath, spec })
  }
}

async function build (specName: string = "appSpec", options: BuildOptions = {}) {
  console.log("Starting MetaliQ project build")
  const simplePath = optionsSimplePath(options)
  await pExec(tscPath)
  const spec = await importSpec(specName, simplePath)
  const pubTarget = spec.publication?.target || spa
  await pubTarget.builder({ specName, simplePath, spec })
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
    console.log(`Loaded specification ${spec.label}`)
    return spec
  } catch (e) {
    console.log(`Couldn't find spec  ${path} > ${name}`)
    return null
  }
}

function optionsSimplePath (options: BaseOptions) {
  if (options.file?.substr(-3).match(/\.[tj]s/)) options.file = options.file.substring(0, -4)
  return options.file || "specs"
}
