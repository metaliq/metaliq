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
import { Cloud, GraphQLServerConfig } from "./graphql-server"
import { ensureAndWriteFile } from "@metaliq/util/lib/fs"
import { join } from "path"
import { makeProdJs } from "@metaliq/publication/lib/prod-js"
import { dedent } from "ts-dedent"
import "dotenv/config"
import findFreePorts from "find-free-ports"
import sourceMapSupport from "source-map-support"
import { AddressInfo } from "node:net"
import { startStandaloneServer } from "@apollo/server/standalone"

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
  const schemaPath = config.run.schemaPath || "./gql/schema.gql"
  const typeDefs = await readFile(schemaPath, "utf8")

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

  // Make production javascript
  const schemaPath = config.run.schemaPath || "./gql/schema.gql"
  const schema = await readFile(schemaPath, "utf8")
  await ensureAndWriteFile("bin/schema.js", dedent`
    export const typeDefs = \`
      ${schema}
    \`
  `)

  model.publicationTarget

  await ensureAndWriteFile(jsSrc, indexJs(modelName, simplePath, config))
  const prodJsOutputs = await makeProdJs({
    src: jsSrc,
    external: ["apollo-server-cloud-functions", "apollo-server-lambda", "electron", "firebase-functions", "node-fetch", "@supabase/supabase-js", "@sendgrid/mail"]
  })
  await remove(jsSrc)
  const mainFileName = `${config.build?.jsFilename || "index"}.js`
  for (const [i, output] of prodJsOutputs.entries()) {
    const fileName = i === 0 ? mainFileName : output.fileName
    await ensureAndWriteFile(join(destDir, fileName), output.code)
  }

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

const indexJs = (
  modelName: string,
  modelPath: string,
  config: GraphQLServerConfig
) => {
  const handlerExportName = config.build.handlerExportName || "handler"
  const handler = config.build.handler
    ? `${modelName}.publicationTarget.web`
  return dedent`
    import { ApolloServer } from "@apollo/server"
    import { typeDefs } from "./schema.js"
    import { ${modelName} } from "./${modelPath}.js"
    
    ${config.build.handler ? "" : 
      "import { defaultHandler } from \"@metaliq/graphql-server/lib/default-handler\""
    }
    
    const server = new ApolloServer({ 
      typeDefs, 
      resolvers: ${modelName}.resolvers
    })
    
    export const ${handlerExportName} = ${config.build.handler
      ?
    }
  `
}
