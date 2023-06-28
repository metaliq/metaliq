import { mkdir } from "fs/promises"
import { readFileSync } from "fs"
import { generatePages, watchAndGenerate } from "../pipe/generate-pages"
import { Command } from "commander"
import { resolve } from "path"

const moduleFileParts = import.meta.url.split("/")
const moduleFileFirstPartNum = moduleFileParts.lastIndexOf("") + 1
const moduleFilePartsTrimmed = moduleFileParts.slice(moduleFileFirstPartNum)
const moduleFile = "/" + moduleFilePartsTrimmed.join("/")

const pkgFile = resolve(moduleFile, "../../../package.json")

const pkg = JSON.parse(readFileSync(pkgFile, "utf8"))

const program = new Command()
program
  .name("metadoc")
  .version(pkg.version, "-v, --version")
  .argument("<inDir>", "input directory")
  .argument("<outDir>", "output directory")
  .option("-w, --watch", "watch for changes")

program.parse()

const options: { watch: boolean } = program.opts()
const [inDir, outDir] = program.args

console.log(`Running metadoc on ${inDir} to ${outDir} ${options.watch ? "and watching for changes" : ""}`)

async function main () {
  await mkdir(outDir, { recursive: true })
  if (options.watch) {
    await watchAndGenerate(inDir, outDir)
  } else {
    await generatePages(inDir, outDir)
  }
}

main().catch(console.error)
