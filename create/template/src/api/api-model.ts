import { MetaModel } from "metaliq"
import { Dependency, Package, Resolvers } from "../gen/graphql-types"
import { graphQLServer } from "@metaliq/graphql-server"
import { readFile, writeFile } from "fs/promises"

export const apiModel: MetaModel<Resolvers> = {
  publicationTarget: graphQLServer(),
  resolvers: {
    Query: {
      async fetchPackage() {
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
        const peerDependencies = getDeps("peerDependencies")
        return { author, name, license, version, description, devDependencies, dependencies, peerDependencies } as Package
      }
    },
    Mutation: {
      async updatePackage(parent, { pkg }) {
        // A small delay to simulate real network latency and allow progress message delay
        await wait()
        const oldJson = await readFile("./package.json", "utf8")
        const oldPkg = JSON.parse(oldJson) as Package
        removeNulls(pkg)
        const setDeps = (deps: Dependency[]) => deps.reduce((acc, dep) => acc[dep.name] = acc.version, {} as any)
        const newPkg = {
          ...oldPkg,
          ...pkg,
          dependencies: setDeps(pkg.dependencies),
          peerDependencies: setDeps(pkg.dependencies),
          devDependencies: setDeps(pkg.dependencies)
        }
        const newJson = JSON.stringify(newPkg, null, "  ")
        await writeFile("./package.json", newJson)
        return newPkg
      }
    }
  }
}

const removeNulls = (object: any) => {
  for (const key in object) {
    if (object[key] === null) delete object[key]
  }
}

const wait = (delay: number = 1000) => new Promise(resolve => setTimeout(resolve, delay))