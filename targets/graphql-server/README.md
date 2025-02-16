# @metaliq/graphql-server

The GraphQL Server publication target for MetaliQ makes it easy to create a schema-based API.

## Setup

Start with a GraphQL schema file. This can be located in your project at `gql/schema.gql`, or at a different location which you specify in the configuration for this publication target. The MetaliQ template solution includes an example schema.

Then generate a TypeScript file to match the schema, including its data and resolver types. Again, the template solution includes the necessary packages from @graphql-codegen to do this in its `package.json` file, and does this automatically in its build and run scripts.

Now create a MetaModel from the automatically generated `Resolvers` type and use its `resolvers` term to define whatever resolvers you need for queries, mutations, subscriptions and data types (for nested resolution within operation results).

For more information on resolvers, see the Apollo documentation.

## Locating your API MetaModel(s)

Note that it's best to keep your top-level API MetaModel definitions and any *back-end specific* code in a separate file (or files) from any front-end MetaModel definitions (using `web-page-app` or `web-component` publication targets for example) to ensure there can be no leakage of back-end specific code or dependencies into front-end bundles.

You can of course share code easily between front and back end using `import` to load any module that is appropriate for use in both places.

You can then run your api with a file path option, like:

`metaliq run -f models/api-model apiModel`

which would use the exported model `apiModel` within the file `src/models/api-model.ts`.

## Running in Development

When you run a MetaModel within this publication target in development using `metaliq run` a GraphQL server is started on your local machine. You can browse to the location that is displayed in the run console and use the GraphQL IDE at that location to try queries and other operations.

## Building for production

When you build the MetaModel with `metaliq build`, an output folder is created at the configured `destDir`, which defaults to `prod/api` containing bundled, minified code `index.js` to run the server.

By default a simple Apollo standalone server is produced, suitable for running in a NodeJS environment. 

Customising for your Cloud Environment

You can specify `prologueTs` and `epilogueTs` to provide environment-specific TypeScript setup and export code for the main production entry point file.

For example, on AWS Lambda you could use the following prologueTS:

```ts

import {
  startServerAndCreateLambdaHandler,
  handlers,
} from '@as-integrations/aws-lambda';

```

and the following epilogueTS:

```ts

export const graphqlHandler = startServerAndCreateLambdaHandler(
  server,
  // We will be using the Proxy V2 handler
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);

```

If you use  also need to add a `copy` configuration for a suitably configured `package.json` file - this is required in cloud function environments such as Netlify and Firebase, for example. Check the relevant environment documentation for details.

## Connecting from a Front End

The template solution includes auto-generation of a full TypeScript API based on a set of concrete operations and their parameters and payloads defined (by default) in `gql/operations.gql`. You can either call these methods directly for  type-safe interaction with your API, or you can go further and use the `op` MetaFunction to provide automatic connections from your front-end MetaModels to API operations. See the `@metaliq/integration` documentation for more information.

## Configuration

```ts

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
     * JS script to include between initial imports and Apollo server definition.
     */
    prologueJs?: string

    /**
     * JS script to include after creation of Apollo server,
     * typically sets up the appropriate cloud environment export.
     */
    epilogueJs?: string

    /**
     * Files to copy into build.
     * Note, unlike webPageApp, the `res` folder is _not_ copied by default.
     */
    copy?: CopyEntry[]
  }
}


```
