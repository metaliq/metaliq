import { MetaModel } from "metaliq"
import { Dependency, Package, Resolvers } from "../gen/graphql-types"
import { graphQLServer } from "@metaliq/graphql-server"
import { readFile, writeFile } from "fs/promises"

export const apiModel: MetaModel<Resolvers> = {
  publicationTarget: graphQLServer({ run: { port: 8940 } }),
  resolvers: {
    Query: {
      async fetchPackage () {
        // A small delay to simulate real network latency and allow progress message delay
        await wait()
        const json = await readFile("./package.json", "utf8")
        const pkg = JSON.parse(json)
        // Extract known keys
        const { author, name, license, version, description } = pkg
        const getDeps = (key: keyof Package) =>
          Object.entries(pkg[key] || {}).map(([k, v]) => ({ name: k, version: v })) as Dependency[]
        const dependencies = getDeps("dependencies")
        const devDependencies = getDeps("devDependencies")
        return { author, name, license, version, description, devDependencies, dependencies } as Package
      }
    },
    Mutation: {
      async updatePackage (parent, { pkg }) {
        // A small delay to simulate real network latency and allow progress message delay
        await wait()
        const oldJson = await readFile("./package.json", "utf8")
        const oldPkg = JSON.parse(oldJson) as Package
        const setDeps = (deps: Dependency[]) => deps.reduce((acc: any, dep) => ({
          ...acc,
          [dep.name]: dep.version
        }), {})
        const newPkg = {
          ...oldPkg,
          ...pkg,
          dependencies: setDeps(pkg.dependencies),
          devDependencies: setDeps(pkg.devDependencies)
        } // Consolidated package structured with dependencies as objects
        const newJson = JSON.stringify(newPkg, (k, v) => v === null ? undefined : v, "  ") + "\n"
        await writeFile("./package.json", newJson)
        return { ...oldPkg, ...pkg } // Consolidated package with dependencies as arrays, as per schema
      }
    }
  }
}

const wait = (delay: number = 500) => new Promise(resolve => setTimeout(resolve, delay))
