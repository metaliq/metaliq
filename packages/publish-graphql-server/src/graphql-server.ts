import { Builder, Cleaner, PublicationTarget, Runner } from "@metaliq/publication"

export type GraphQLServerSpec<T> = {
  /**
   * Service resolvers.
   */
  resolvers?: T
}

declare module "metaliq" {
  namespace Policy {
    interface Specification<T, P> extends GraphQLServerSpec<T> {
      this?: Specification<T, P>
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
    /**
     * Defaults to prod/api
     */
    destDir?: string

    /**
     * The destination cloud for deployment.
     * Current values are "firebase" or "netlify" - both cloud function platforms.
     * Defaults to firebase for legacy reasons.
     */
    cloud?: Cloud

    /**
     * Deployment options for various cloud-specific configurations.
     */
    cloudFnOptions?: CloudFnOptions

    useDomShim?: boolean
  }
}

export type Cloud = "firebase" | "netlify"

/**
 * Cloud options for Firebase.
 */
export type CloudFnOptions = {
  memory?: string
  timeoutSeconds?: number
  vpcConnector?: string
}

const nodeModule = "./graphql-server-node.js"

export const graphQLServer = (config: GraphQLServerConfig): PublicationTarget => ({
  name: "GraphQL Server",

  /**
   * A wrapper around a dynamically imported runner, in order that Node packages are not linked in a browser context.
   */
  async runner (context) {
    const { graphQLServerRunner }: {
      graphQLServerRunner: (config: GraphQLServerConfig) => Runner
    } = await import (nodeModule)
    return await graphQLServerRunner(config)(context)
  },

  /**
   * A wrapper around a dynamically imported builder, in order that Node packages are not linked in a browser context.
   */
  async cleaner (context) {
    const { graphQLServerCleaner }: {
      graphQLServerCleaner: (config: GraphQLServerConfig) => Cleaner
    } = await import (nodeModule)
    return await graphQLServerCleaner(config)(context)
  },

  /**
   * A wrapper around a dynamically imported builder, in order that Node packages are not linked in a browser context.
   */
  async builder (context) {
    const { graphQLServerBuilder }: {
      graphQLServerBuilder: (config: GraphQLServerConfig) => Builder
    } = await import (nodeModule)
    return await graphQLServerBuilder(config)(context)
  }
})
