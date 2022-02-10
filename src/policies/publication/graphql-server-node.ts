import { createServer, Server } from "http"
import { Builder, Cleaner, Runner } from "./publication"
import { ApolloServer as ApolloServerExpress } from "apollo-server-express"
import express from "express"
import fsExtra from "fs-extra"
import { SinglePageAppConfig } from "./spa"
import { GraphQLServerConfig } from "./graphql-server"
import { ensureAndWriteFile } from "./util"
import { join } from "path"
import { makeProdJs } from "./prod-js"
import { dedent } from "ts-dedent"

const { readFile, remove } = fsExtra

let httpServer: Server
let apolloServer: ApolloServerExpress

const jsSrc = "bin/index.js" // Location for generated JS entry point in dev and src for build

export const runner: Runner = async ({ specName, simplePath, spec }) => {
  const port = spec.publication?.graphQLServer?.run?.port || 8940
  const hostname = "localhost" // TODO: Make configurable

  // Stop any previous running servers
  if (apolloServer) await apolloServer.stop()
  if (httpServer) httpServer.close()

  // Create the HTTP server that will host the API
  const app = express()
  app.use(express.json({ limit: "50mb" }))
  httpServer = createServer(app)

  // Load the GraphQL schema and resolvers
  // TODO: Make schema location configurable
  const typeDefs = await readFile("./gql/schema.gql", "utf8")

  // Create the query / mutation service
  apolloServer = new ApolloServerExpress({
    typeDefs,
    resolvers: spec.resolvers,
    context: ({ req }) => {
      return {
        sessionToken: req.headers["session-token"]
      }
    }
  })
  await apolloServer.start()
  apolloServer.applyMiddleware({ app })

  // Start the API server
  httpServer.listen(port, hostname, () =>
    console.log(`MetaliQA API server running on http://${hostname}:${port}${apolloServer.graphqlPath}`)
  )

  return true
}

export const cleaner: Cleaner = async ({ spec }) => {
  const gql: GraphQLServerConfig = spec.publication?.graphQLServer
  const destDir = gql?.build?.destDir || "prod/api"

  // Clean previous build
  await remove(destDir)
  return true
}

export const builder: Builder = async ({ spec, simplePath, specName }) => {
  const spa: SinglePageAppConfig = spec.publication?.spa
  const destDir = spa?.build?.destDir || "prod/api"

  // Make production javascript
  // TODO: Make schema location configurable
  const schema = await readFile("./gql/schema.gql", "utf8")
  await ensureAndWriteFile("bin/schema.js", schemaJs(schema))
  await ensureAndWriteFile(jsSrc, indexJs(specName, simplePath))
  const js = await makeProdJs({
    src: jsSrc,
    exclude: ["electron", "./graphql-server-node"],
    external: ["apollo-server-cloud-functions", "firebase-functions", "node-fetch"]
  })
  // await remove(jsSrc)
  await ensureAndWriteFile(join(destDir, "index.js"), js)

  // Add package.json
  const json = JSON.stringify(packageJson, null, "  ")
  await ensureAndWriteFile(join(destDir, "package.json"), json)

  return true
}

// TBD: Subscriptions

// Fake imports
class SubscriptionServer {
  static create (...params: any[]): any {
    return false
  }

  close () {
  }
}

class PubSub {
}

// Module level - change to let
let subServer: SubscriptionServer
// Need to have a way of specifying
export let pubsub: PubSub

export const startSubscriptionServer = (schema: any) => {
  if (subServer) subServer.close()

  // Create the subscription service
  subServer = SubscriptionServer.create({
    onConnect: (connectionParams: any, socket: any) => {
      return { sessionToken: connectionParams["session-token"] }
    }
    // NOTE: Disabled next line due to some import issues with execute and subscribed from graphql
    // ...{ schema, execute, subscribe }
  }, {
    server: httpServer, path: apolloServer.graphqlPath
  })

  // Create new PubSub hub for subscription triggering
  pubsub = new PubSub()
}

const schemaJs = (schema: string) => dedent`
  import { gql } from "apollo-server-cloud-functions"
  
  export const typeDefs = gql\`
    ${schema}
  \`
`

const indexJs = (specName: string, specPath: string) => dedent`
  import { typeDefs } from "./schema.js"
  import { ${specName} } from "./${specPath}.js"
  
  import { ApolloServer } from "apollo-server-cloud-functions"
  import functions from "firebase-functions"
  
  const server = new ApolloServer({ 
    typeDefs, 
    resolvers: ${specName}.resolvers,
    playground: true,
    introspection: true
  })

  export const graphql = functions.https.onRequest(server.createHandler())
`

const packageJson = {
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
    node: "14"
  },
  type: "module",
  main: "index.js",
  dependencies: {
    "@lit-labs/ssr": "^1.0.0",
    "apollo-server-cloud-functions": "^3.6.1",
    "firebase-admin": "^9.8.0",
    "firebase-functions": "^3.14.1",
    graphql: "^16.2.0",
    lit: "^2.0.0",
    "node-fetch": "3"
  },
  devDependencies: {
    "firebase-functions-test": "^0.2.0"
  },
  private: true
}
