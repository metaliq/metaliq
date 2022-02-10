import { exec } from "child_process"
import fs from "fs-extra"

export async function getGitBranchName () {
  const { stdout, stderr } = await exec("git rev-parse --abbrev-ref HEAD")
  if (stderr) return console.error("Cannot read GIT branch name")
  return stdout.toString().trim()
}

export async function ensureAndWriteFile (path: string, content: string) {
  await fs.ensureFile(path)
  await fs.writeFile(path, content)
}

/**
 * Workaround for CommonJS modules that provide a named export called `default`
 * but have a type definition that say this will be their proper default export.
 * This pattern is produced by some module bundlers,
 * but is not supported by NodeJS import().
 */
export const getCjsDefault = <T> (module: T): T => (module as any).default
