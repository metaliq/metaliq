import { readFile } from "fs/promises"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import util from "util"
import { exec } from "child_process"

const pExec = util.promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function link () {
  console.log(`Linking local metaliq development modules to client project at ${process.cwd()}`)
  await processRefs("link")
}

export async function unlink () {
  console.log(`Unlinking local metaliq development modules from client project at ${process.cwd()}`)
  await processRefs("unlink")
}

type LinkUnlink = "link" | "unlink"

export async function processRefs (linkUnlink: LinkUnlink) {
  const tsConfigStr = await readFile(resolve(__dirname, "../../tsconfig.json"), "utf8")
  const tsConfig = JSON.parse(tsConfigStr)
  const refs: Array<{ path: string }> = tsConfig.references || []
  for (const ref of refs) {
    console.log(`Processing ${ref.path}`)
    const command = `pnpm ${linkUnlink} ../metaliq/${ref.path}`
    await pExec(command)
  }
}
