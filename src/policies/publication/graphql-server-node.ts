import { createServer, Server } from "http"
import { execute, subscribe } from "graphql"
import { Runner } from "./publication"
import { ApolloServer } from "apollo-server-express"
import express from "express"
import fs from "fs-extra"
import { makeExecutableSchema } from "@graphql-tools/schema"

let httpServer: Server
let apolloServer: ApolloServer

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
  const typeDefs = await fs.readFile("./gql/schema.gql", "utf8")
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers: spec.resolvers
  })

  // Create the query / mutation service
  apolloServer = new ApolloServer({
    schema,
    context: ({ req }) => {
      return {
        sessionToken: req.headers["session-token"]
      }
    }
  })
  await apolloServer.start()
  apolloServer.applyMiddleware({ app })

  // Create new PubSub hub for subscription triggering
  pubsub = new PubSub()

  // Start the API server
  httpServer.listen(port, hostname, () =>
    console.log(`MetaliQA API server running on http://${hostname}:${port}${apolloServer.graphqlPath}`)
  )

  return true
}

// TBD: Subscriptions

// Fake imports
class SubscriptionServer {
  static create (...params: any[]): any { return false }
  close () {}
}
class PubSub {}

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
    },
    ...{ schema, execute, subscribe }
  }, {
    server: httpServer, path: apolloServer.graphqlPath
  })

  // Create new PubSub hub for subscription triggering
  pubsub = new PubSub()

}
