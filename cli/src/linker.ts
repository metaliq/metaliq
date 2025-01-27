import { readFile } from "fs/promises"
import util from "util"
import { exec } from "child_process"
import { join } from "path"

const pExec = util.promisify(exec)

export async function link (path: string) {
  console.log(`Linking local metaliq development modules to client project at ${process.cwd()}`)
  await processRefs("link", path)
}

export async function unlink (path: string) {
  console.log(`Unlinking local metaliq development modules from client project at ${process.cwd()}`)
  await processRefs("unlink", path)
}

type LinkUnlink = "link" | "unlink"

export async function processRefs (linkUnlink: LinkUnlink, path: string = "../metaliq") {
  const tsConfigStr = await readFile("../metaliq/tsconfig.json", "utf8")
  const tsConfig = JSON.parse(tsConfigStr)
  const refs: Array<{ path: string }> = tsConfig.references || []
  for (const ref of refs) {
    console.log(`Processing ${ref.path}`)
    const refPath = join(path, ref.path)
    const command = `pnpm ${linkUnlink} ${refPath}`
    await pExec(command)
  }
}
