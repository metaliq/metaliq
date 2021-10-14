import { Command } from "commander"
import { promisify } from "util"
import { exec } from "child_process"
import { startProjectServer } from "./dev-server"
import dedent from "dedent"
import { ensureDir, writeFile } from "fs-extra"
import { join } from "path"
import { installWindowOnGlobal } from "@lit-labs/ssr/lib/dom-shim"

const pExec = promisify(exec)

const program = new Command()
program
  .name("metaliq")
  .version("0.1.0")
  .option("-c, --config <filePath>", "Use the specified configuration")

program
  .command("dev [specName]")
  .option("-p --port <port>", "Port number", "8900")
  .description("Start the MetaliQ development server for the given path/spec (defaults to appSpec)")
  .action(serve)

program
  .command("build [specName]")
  .option("-f --file <file>", "File location within source dir, with or without .ts extension", "model/specs")
  .description("Run the build for the given spec (defaults to appSpec)")
  .action(build)

program.parse()

async function serve (spec: string = "appSpec", options: any = {}) {
  const port = +options?.port || 8900
  console.log("Starting file watching compiler")
  exec("tsc --watch")
  console.log(`Starting metaliq serve for ${spec} on port ${port}`)
  await new Promise(resolve => setTimeout(resolve, 2000))
  await ensureDir("bin")
  await writeFile("bin/app.js", dedent`
    import { run } from "metaliq/lib/policies/application/application"
    import { ${spec} } from "./model/specs.js"
    
    run(${spec})
  `)
  await startProjectServer(process.cwd(), port)
}

async function build (spec: string = "appSpec", options: { file?: string } = {}) {
  if (options.file?.substr(-3).match(/\.[tj]s/)) options.file = options.file.substring(0, -4)
  const path = options.file || "model/specs"
  console.log(`Building MetaliQ specification ${path} > ${spec}`)
  console.log(`Working dir ${process.cwd()}`)
  await pExec("tsc")
  installWindowOnGlobal() // Shim to prevent import error in lit
  const module = await import (join(process.cwd(), `bin/${path}.js`))
  console.log(module)
}
