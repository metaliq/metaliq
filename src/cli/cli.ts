import { exec, spawn } from "child_process"
import { join } from "path"
import { promisify } from "util"

import { Command } from "commander"
import { installWindowOnGlobal } from "@lit-labs/ssr/lib/dom-shim"

import { MetaSpec } from "../meta"
import { spa } from "../policies/publication/spa"

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
    let completed = false
    const tscProcess = spawn("tsc", ["--watch"])
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
  console.log(`Loading MetaliQ specification ${simplePath} > ${specName}`)
  const spec = await importSpec(specName)
  console.log(`Loaded specification ${spec.label}`)

  const pubTarget = spec.publication?.target || spa
  if (!pubTarget?.runner) {
    console.log("Missing publication target runtime")
  } else {
    console.log(`Running specification with publication target ${pubTarget.name}`)
    await pubTarget.runner({ specName, simplePath, spec })
  }
}

async function build (specName: string = "appSpec", options: BuildOptions = {}) {
  const simplePath = optionsSimplePath(options)
  console.log(`Building MetaliQ specification ${simplePath} > ${specName}`)
  console.log(`Working dir ${process.cwd()}`)
  await pExec("tsc")
  const spec = await importSpec(specName, simplePath)
  await spec.publication.target.builder({ specName, simplePath, spec })
}

async function importSpec (name: string = "appSpec", path: string = "specs") {
  const module = await import (join(process.cwd(), `bin/${path}.js`))
  const spec: MetaSpec<any> = module[name]
  return spec
}

function optionsSimplePath (options: BaseOptions) {
  if (options.file?.substr(-3).match(/\.[tj]s/)) options.file = options.file.substring(0, -4)
  return options.file || "specs"
}
