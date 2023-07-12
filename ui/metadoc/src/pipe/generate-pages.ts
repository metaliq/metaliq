import { read, write } from "to-vfile"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkDirective from "remark-directive"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"
import rehypeSlug from "rehype-slug"
import Path from "path"
import { dedent } from "ts-dedent"
import rehypeRaw from "rehype-raw"
import { ModuleImport, ModuleData, ModuleModel } from "./types"
import { remarkMetaCode } from "./remark-meta-code"
import { capitalize } from "@metaliq/util"
import { mkdir, readdir } from "fs/promises"
import Watcher from "chokidar"
import remarkFrontmatter from "remark-frontmatter"
import { matter } from "vfile-matter"

const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(() => (tree, file) => {
    matter(file)
  })
  .use(remarkMetaCode)
  .use(remarkDirective)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify)
  .use(rehypeSlug)

const sourceEx = /\.md$/

export async function generatePages (inDir: string, outDir: string) {
  const filePaths = await readDirPaths(inDir)

  for (const inPath of filePaths) {
    if (inPath.match(sourceEx)) {
      try {
        await generatePage(inDir, outDir, inPath)
      } catch (e) {
        console.error(`ERROR generating page ${inPath}\n`)
        throw e
      }
    }
  }
}

export async function watchAndGenerate (inDir: string, outDir: string) {
  const onChange = (path: string) => {
    if (path.match(sourceEx)) {
      generatePage(inDir, outDir, path).catch(console.error)
    }
  }

  await generatePages(inDir, outDir)
  Watcher.watch(inDir, { ignoreInitial: true })
    .on("change", onChange)
    .on("add", onChange)
}

export async function generatePage (inDir: string, outDir: string, inPath: string) {
  const subPath = Path.relative(inDir, inPath)
  const outPath = Path.join(outDir, subPath).split(".").slice(0, -1).concat("ts").join(".")
  await mkdir(Path.dirname(outPath), { recursive: true })

  const processorData = processor.data()
  processorData.moduleData = {}
  const file = await processor.process(await read(inPath))
  const frontmatter = file.data?.matter as { import?: string | string[], model?: string | string [] }
  const viewName = Path.basename(inPath)
    // Remove extension
    .replace(/\.[^/.]+$/, "")
    // Change from kebab to camel case
    .split("-")
    .map((w, i) => i > 0 ? capitalize(w) : w)
    .join("")

  const model: ModuleModel = frontmatter.model
    ? typeof frontmatter.model === "string"
      ? { type: frontmatter.model, name: "v", name$: "$" }
      : { type: frontmatter.model[0], name: frontmatter.model[1], name$: frontmatter.model[1] + "$" }
    : { type: "any", name: "v", name$: "$" }

  const moduleData: ModuleData = {
    viewName,
    model,
    imports: []
  }

  // Create a relative path to `src`
  const nestedDepth = subPath.split("/").filter(Boolean).length
  const src = Array.from({ length: nestedDepth + 1 }, () => "..").join("/")

  for (const [path, members] of Object.entries(frontmatter?.import || {})) {
    const importPath = path.match(/^\//)
      ? src + path
      : path
    const importMembers = Array.isArray(members)
      ? `{ ${members.join(", ")} }`
      : members

    moduleData.imports.push({
      id: importMembers,
      from: importPath
    })
  }

  const html = file.value.toString()
    .replace(/&#x3C;/g, "<") // TODO: Proper fix to prevent munging embedded tags in code expressions
    .replace(/`/gm, "\\`") // Escape any remaining backtick characters, for example within code blocks
  const value = htmlTs(html, moduleData)

  await write({ path: outPath, value })
}

const htmlTs = (html: string, moduleData: ModuleData) => {
  const imports: ModuleImport[] = [
    { id: "{ html }", from: "lit" },
    { id: "{ MetaView }", from: "@metaliq/presentation" },
    ...moduleData.imports
  ]

  const importsTs = imports.map(i => `import ${i.id} from "${i.from}"`).join("\n")

  const ts = dedent`
    ${importsTs}

    export const ${moduleData.viewName}: MetaView<${moduleData.model.type || "any"}> = (${moduleData.model.name}, ${moduleData.model.name$}) => html\`
      ${html.trim()}
    \`
    
  `
  // Preserve empty last line in template above
  return ts
}

const readDirPaths = async (dir: string) => {
  let paths: string[] = []
  const files = await readdir(dir, { withFileTypes: true })

  for (const file of files) {
    const path = Path.join(dir, file.name)
    if (file.isDirectory()) {
      const childFileNames = await readDirPaths(path)
      paths = [...paths, ...childFileNames]
    } else {
      paths.push(path)
    }
  }

  return paths
}
