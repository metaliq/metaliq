import { Builder, Cleaner, PublicationTarget, Runner } from "@metaliq/publication"
import type { ApolloServer, ContextFunction } from "@apollo/server"
import type { CorsOptions } from "cors"
import type { RequestHandler } from "express"
import { ExpressContextFunctionArgument } from "@apollo/server/express4"

export * from "./default-handler"

export interface GraphQLServerTerms<T> {
  /**
   * Service resolvers.
   */
  resolvers?: T

  /**
   * Provider function for a customised handler for the production build.
   * By default, the handler is a simple stand-alone Apollo server.
   * This needs to be changed if you are running in a cloud function environment, for example.
   */
  productionGraphQLHandler?: ProductionGraphQLHandler
}

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends GraphQLServerTerms<T> {
      this?: Terms<T, P>
    }
  }
}

export type ProductionGraphQLHandler = (server: ApolloServer, port: number) => any

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
     * Port to run on.
     * If not specified, a free port will be assigned in the dev environment
     * and the default build epilogue javascript will use port 8940.
     */
    port?: number

    /**
     * Defaults to blank.
     */
    hostname?: string

    /**
     * Custom middleware for adding things to the GraphQL resolver context object. For example:
     *
     * ```
     * async ({ req }) => {
     *   return {
     *     sessionToken: req.headers["session-token"] as string
     *   }
     * }
     * ```
     */
    middleware?: ContextFunction<ExpressContextFunctionArgument[]>

    /**
     * Configure CORS.
     * If not provided, CORS will be enabled by default, suitable for development.
     */
    cors?: CorsOptions

    /**
     * Handlers for routes other than GraphQL, for example authorization callbacks.
     */
    otherRoutes?: Array<[string, RequestHandler]>
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
     * Files to copy into build.
     * Note, unlike webPageApp, the `res` folder is _not_ copied by default.
     */
    copy?: CopyEntry[]

    /**
     * Name of the main JS file in the production output.
     * Defaults to `index` but may need to be different depending on cloud environment.
     * The `.js` extension will be added automatically.
     */
    jsFilename?: string

    /**
     * Customise the `package.json` file of the production build.
     */
    packageJson?: string

    /**
     * Exported name for the provided production handler.
     * Defaults to "handler".
     */
    handlerExportName?: string
  }
}

type CopyEntry = string | {
  src: string // Within project dir.
  dest?: string // Within destDir. Defaults to same as src
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

export const graphQLServer = (config: GraphQLServerConfig = {}): PublicationTarget => ({
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
