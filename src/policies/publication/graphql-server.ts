import { Builder, PublicationTarget, Runner } from "./publication"

export type GraphQLServerSpec<T> = {
  /**
   * Service resolvers.
   */
  resolvers?: T
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P, C> extends GraphQLServerSpec<T> {
      this?: Specification<T, P, C>
    }
  }
}

declare module "./publication" {
  namespace Publication {
    interface PublicationSpec {
      graphQLServer?: GraphQLServerConfig
    }
  }
}

export type GraphQLServerConfig = {
  /**
   * Details for the runtime.
   */
  run?: {
    /**
     * Defaults to ./gql/schema.gql.
     */
    schemaPath?: string

    /**
     * Port to run on - defaults to 8940
     */
    port?: number // Defaults to 8940

    /**
     * Defaults to blank.
     */
    hostname?: string
  }

  /**
   * Details for the production build.
   */
  build?: {
    destDir?: string // Defaults to prod/api
  }
}

const nodeModule = "./graphql-server-node.js"

export const graphQLServer: PublicationTarget = {
  name: "GraphQL Server",

  /**
   * A wrapper around a dynamically imported builder, in order that Node packages are not linked in a browser context
   */
  async builder (context) {
    const { builder }: { builder: Builder } = await import (nodeModule)
    return await builder(context)
  },

  /**
   * A wrapper around a dynamically imported runner, in order that Node packages are not linked in a browser context
   */
  async runner (context) {
    const { runner }: { runner: Runner } = await import (nodeModule)
    return await runner(context)
  }
}
