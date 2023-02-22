import fs from "fs-extra"

export async function ensureAndWriteFile (path: string, content: string) {
  await fs.ensureFile(path)
  await fs.writeFile(path, content)
}
