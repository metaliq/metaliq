import { MetaModel } from "metaliq"
import { Package, Resolvers } from "../gen/graphql-types"
import { graphQLServer } from "@metaliq/graphql-server"

export const apiModel: MetaModel<Resolvers> = {
  publicationTarget: graphQLServer(),
  resolvers: {
    Query: {
      async fetchPackage() {
        const result: Package = {
          author: "mickey.mouse",
          name: "My new solution",
          license: "MIT",
          version: "1.2.3",
          description: "Awesome!!!"
        }
        return result
      }
    }
  }
}
