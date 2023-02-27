import { Server } from "http"

let httpServer: Server

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
    server: httpServer, path: "/graphql"
  })

  // Create new PubSub hub for subscription triggering
  pubsub = new PubSub()
}
