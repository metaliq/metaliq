/**
 * @module
 *
 * This module contains the node-specific code for the GraphQL server publication target.
 *
 * It is dynamically imported via the main {@link GraphQLServerConfig GraphQL server module},
 * in order that node-specific dependencies do not "leak" into a browser environment.
 */

import { createServer, Server } from "http"
import { Builder, Cleaner, Runner } from "@metaliq/publication"
import { ApolloServer } from "@apollo/server"
import { expressMiddleware } from "@apollo/server/express4"
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer"
import express from "express"
import cors from "cors"
import fsExtra, { copy } from "fs-extra"
import { Cloud, CloudFnOptions, GraphQLServerConfig } from "./graphql-server"
import { ensureAndWriteFile } from "@metaliq/util/lib/fs"
import { join } from "path"
import { makeProdJs } from "@metaliq/publication/lib/prod-js"
import { dedent } from "ts-dedent"
import "dotenv/config"
import findFreePorts from "find-free-ports"
import sourceMapSupport from "source-map-support"
import { AddressInfo } from "node:net"

sourceMapSupport.install()

const { readFile, remove } = fsExtra

let httpServer: Server
let apolloServer: ApolloServer<any>

const jsSrc = "bin/index.js" // Location for generated JS entry point in dev and src for build

/**
 * Starts the development server for the MetaliQ GraphQL Server publication target.
 */
export const graphQLServerRunner = (
  config: GraphQLServerConfig = {}
): Runner => async ({ model }) => {
  let port = config.run?.port
  if (!port) {
    const ports = await findFreePorts(1, { startPort: 9400, jobCount: 1 })
    port = ports[0]
  }

  // Stop any previous running servers
  if (apolloServer) await apolloServer.stop()
  if (httpServer) httpServer.close()

  // Load the GraphQL schema and resolvers
  // TODO: Make schema location configurable
  const typeDefs = await readFile("./gql/schema.gql", "utf8")

  // Create the HTTP server that will host the API
  const expressApp = express()
  httpServer = createServer(expressApp)
  apolloServer = new ApolloServer<any>({
    typeDefs,
    resolvers: model.resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
  })

  await apolloServer.start()

  expressApp.use(
    "/graphql",
    cors(config.run.cors),
    express.json({ limit: "50mb" }),
    expressMiddleware<any>(
      apolloServer,
      config.run?.middleware && { context: config.run.middleware }
    )
  )

  for (const handler of config?.run?.otherRoutes || []) {
    expressApp.use(handler[0], handler[1])
  }

  const host = config?.run?.hostname
  const listenOpts = host ? { host, port } : { port }

  await new Promise<void>((resolve) => httpServer.listen(listenOpts, resolve))
  const info = httpServer.address() as AddressInfo
  console.log(`GraphQL server running on http://${host || "localhost"}:${info.port}/graphql`)

  return true
}

export const graphQLServerCleaner = (
  config: GraphQLServerConfig = {}
): Cleaner => async ({ model }) => {
  const destDir = config.build?.destDir || "prod/api"

  // Clean previous build
  await remove(destDir)
  return true
}

export const graphQLServerBuilder = (
  config: GraphQLServerConfig = {}
): Builder => async ({ model, simplePath, modelName }) => {
  const destDir = config.build?.destDir || "prod/api"
  const cloud = config.build?.cloud || "firebase"
  const useDomShim = !!config.build?.useDomShim

  // Make production javascript
  // TODO: Make schema location configurable
  const schema = await readFile("./gql/schema.gql", "utf8")
  await ensureAndWriteFile("bin/schema.js", schemaJs(schema, cloud))
  await ensureAndWriteFile(jsSrc, indexJs(modelName, simplePath, cloud, config?.build?.cloudFnOptions, useDomShim))
  const prodJsOutputs = await makeProdJs({
    src: jsSrc,
    external: ["apollo-server-cloud-functions", "apollo-server-lambda", "electron", "firebase-functions", "node-fetch", "@supabase/supabase-js", "@sendgrid/mail"]
  })
  await remove(jsSrc)
  const cloudFileNames: Record<Cloud, string> = {
    firebase: "index",
    netlify: "graphql"
  }
  const mainFileName = `${cloudFileNames[cloud]}.js`
  for (const [i, output] of prodJsOutputs.entries()) {
    const fileName = i === 0 ? mainFileName : output.fileName
    await ensureAndWriteFile(join(destDir, fileName), output.code)
  }

  // Add package.json
  const json = JSON.stringify(packageJson[cloud], null, "  ")
  await ensureAndWriteFile(join(destDir, "package.json"), json)

  await ensureAndWriteFile(join(destDir, ".npmrc"), "auto-install-peers=true")
  // Copy additional files
  const copies = config.build?.copy || []
  for (const entry of copies) {
    const { src, dest }: { src: string, dest?: string } = (typeof entry === "string")
      ? { src: entry, dest: entry }
      : { src: entry.src, dest: entry.dest || entry.src }
    await copy(src, `${destDir}/${dest}`, { dereference: true })
  }

  return true
}

const apolloCloudLib: Record<Cloud, string> = {
  firebase: "apollo-server-cloud-functions",
  netlify: "apollo-server-lambda"
}

const schemaJs = (schema: string, cloud: Cloud) => dedent`
  import { gql } from "${apolloCloudLib[cloud]}"
  
  export const typeDefs = gql\`
    ${schema}
  \`
`

const indexJs = (
  modelName: string,
  modelPath: string,
  cloud: Cloud,
  cloudFnOptions: CloudFnOptions = {},
  useDomShim: boolean
) => {
  if (cloudFnOptions.vpcConnector) Object.assign(cloudFnOptions, { vpcConnectorEgressSettings: "ALL_TRAFFIC" })

  const cloudExportMap: Record<Cloud, () => string> = {
    firebase: () => dedent`
      export const graphql = functions
      .runWith(${JSON.stringify(cloudFnOptions)})
      .https
      .onRequest(server.createHandler())
    `,
    // In Netlify we need to add the requestContext that is missing from underlying vendia/serverless-express
    netlify: () => dedent`
      const apolloHandler = server.createHandler();
      
      export const handler = (event, context) => {
        if (!event.requestContext) {
          event.requestContext = context;
        }
        return apolloHandler(event, context);
      }
    `
  }
  const cloudExport = cloudExportMap[cloud]()

  return dedent`
    ${useDomShim ? "import { installWindowOnGlobal } from \"@lit-labs/ssr/lib/dom-shim\"" : ""}
    import { typeDefs } from "./schema.js"
    import { ${modelName} } from "./${modelPath}.js"
    
    import { ApolloServer } from "${apolloCloudLib[cloud]}"
    ${cloud === "firebase" ? "import functions from \"firebase-functions\"" : ""}
    
    const server = new ApolloServer({ 
      typeDefs, 
      resolvers: ${modelName}.resolvers,
      playground: true,
      introspection: true
    })
    
    ${cloudExport}
  `
}

const packageJson: Record<Cloud, object> = {
  firebase: {
    name: "functions",
    description: "Cloud Functions for Firebase",
    scripts: {
      serve: "firebase emulators:start --only functions",
      shell: "firebase functions:shell",
      start: "npm run shell",
      deploy: "firebase deploy --only functions",
      logs: "firebase functions:log"
    },
    engines: {
      node: "20"
    },
    type: "module",
    main: "index.js",
    dependencies: {
      "@google-cloud/functions-framework": "^3.2.1",
      "@lit-labs/ssr": "1.0.0",
      "apollo-server-cloud-functions": "3.6.1",
      "firebase-admin": "9.8.0",
      "firebase-functions": "3.14.1",
      graphql: "16.2.0",
      lit: "2.0.0",
      "node-fetch": "3"
    },
    devDependencies: {
      "firebase-functions-test": "0.2.0"
    },
    private: true
  },
  netlify: {
    name: "functions",
    engines: {
      node: "18"
    },
    type: "module",
    main: "hello.js",
    dependencies: {
      "apollo-server-lambda": "3.10.0",
      graphql: "15.8.0",
      lit: "2.0.0",
      "node-fetch": "3"
    },
    private: true
  }
}
