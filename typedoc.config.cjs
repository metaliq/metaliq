const { readFileSync } = require("fs")

const tsConfigJson = readFileSync("tsconfig.json", "utf8")
const tsConfig = JSON.parse(tsConfigJson)
const entryPoints = tsConfig.references.map(r => r.path)

/** @type {import("typedoc").TypeDocOptions} **/
module.exports = {
  entryPoints,
  entryPointStrategy: "packages",
  readme: "none"
}
