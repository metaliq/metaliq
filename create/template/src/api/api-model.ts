import { MetaModel } from "metaliq"
import { Package, Resolvers } from "../gen/graphql-types"
import { graphQLServer } from "@metaliq/graphql-server"
import { readFile, writeFile } from "fs/promises"

export const apiModel: MetaModel<Resolvers> = {
  publicationTarget: graphQLServer(),
  resolvers: {
    Query: {
      async fetchPackage() {
        const json = await readFile("./package.json", "utf8")
        const pkg = JSON.parse(json) as Package
        const { author, name, license, version, description, devDependencies, dependencies, peerDependencies } = pkg
        return { author, name, license, version, description, devDependencies, dependencies, peerDependencies }
      }
    },
    Mutation: {
      async updatePackage(parent, { pkg }) {
        const oldJson = await readFile("./package.json", "utf8")
        const oldPkg = JSON.parse(oldJson) as Package
        const { author, name, license, version, description, devDependencies, dependencies, peerDependencies } = pkg
        const newPkg: Package = {
          ...oldPkg,
          ...pkg
        }
        const newJson = JSON.stringify(newPkg, null, "  ")
        await writeFile("./package.json", newJson)
        return newPkg
      }
    }
  }
}
