import { exec, spawn } from "child_process"
import { join } from "path"
import { promisify } from "util"

import { Command } from "commander"
import { installWindowOnGlobal } from "@lit-labs/ssr/lib/dom-shim"
import { MetaSpec } from "../meta"
import { spa } from "../policies/publication/spa"
import { Policy } from "../policy"

const pExec = promisify(exec)
installWindowOnGlobal() // Shim to prevent import error in lit

type BaseOptions = {
  file?: string
}

type BuildOptions = BaseOptions

type RunOptions = BaseOptions

const program = new Command()
program
  .name("metaliq")
  .version("0.1.0")

program
  .command("run [specName]")
  .option("-f --file <file>", "Spec file location within source dir, with or without .ts extension", "specs")
  .option("-c --conf <file>", "File location within source dir, with or without .ts extension", "policy")
  .description("Start the MetaliQ development server for the given path/spec (defaults to appSpec)")
  .action(run)

program
  .command("build [specName]")
  .option("-f --file <file>", "File location within source dir, with or without .ts extension", "specs")
  .description("Run the build for the given spec (defaults to appSpec)")
  .action(build)

program.parse()

async function run (specName: string = "appSpec", options: RunOptions = {}) {
  // Initial project compilation with watch
  await new Promise((resolve, reject) => {
    let resolved = false
    const tscProcess = spawn("tsc", ["--watch"])
    tscProcess.stdout.on("data", data => {
      const msg = data.toString()
      if (msg.toString().match(/Starting compilation/)) {
        console.log("Starting file watching compiler")
      } else if (msg.match(/0 errors/)) {
        if (!resolved) {
          console.log("Initial compilation complete")
          resolved = true
          resolve(data)
        } else {
          console.log("Recompiled project code")
        }
      } else {
        console.log(`Compiler message: ${msg}`)
      }
    })
    tscProcess.stderr.on("data", data => {
      console.log("")
      reject(data)
    })
  })

  const simplePath = optionsSimplePath(options)
  console.log(`Loading MetaliQ specification ${simplePath} > ${specName}`)
  const spec = await importSpec(specName)
  const config = await importConfig()
  const pubTarget = spec.publication?.target || spa

  if (!pubTarget?.runner) {
    console.log("Missing publication target runtime")
  } else {
    console.log(`Launching runtime for publication target ${pubTarget.name}`)
    // TODO: Load policy config
    await pubTarget.runner({ specName, simplePath, spec, config })
  }
}

async function build (specName: string = "appSpec", options: BuildOptions = {}) {
  const simplePath = optionsSimplePath(options)
  console.log(`Building MetaliQ specification ${simplePath} > ${specName}`)
  console.log(`Working dir ${process.cwd()}`)
  await pExec("tsc")
  const spec = await importSpec(specName, simplePath)
  await spec.publication.target.builder({ specName, simplePath, spec, config: {} }) // TODO: Load and pass publication policy config (or merge here?)
}

async function importSpec (name: string = "appSpec", path: string = "specs") {
  const module = await import (join(process.cwd(), `bin/${path}.js`))
  const spec: MetaSpec<any> = module[name]
  return spec
}

async function importConfig (name: string = "config", path: string = "policy") {
  const module = await import (join(process.cwd(), `bin/${path}.js`))
  const config: Policy.Configuration = module[name]
  return config
}

const optionsSimplePath = (options: BaseOptions) => {
  if (options.file?.substr(-3).match(/\.[tj]s/)) options.file = options.file.substring(0, -4)
  return options.file || "specs"
}
