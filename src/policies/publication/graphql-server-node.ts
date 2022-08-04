import { createServer, Server } from "http"
import { Builder, Cleaner, Runner } from "./publication"
import { ApolloServer as ApolloServerExpress } from "apollo-server-express"
import express from "express"
import fsExtra from "fs-extra"
import { Cloud, CloudFnOptions, GraphQLServerConfig } from "./graphql-server"
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
  const graphQLServer = spec.publication?.graphQLServer
  const destDir = graphQLServer?.build?.destDir || "prod/api"
  const cloud = graphQLServer?.build?.cloud || "firebase"

  // Make production javascript
  // TODO: Make schema location configurable
  const schema = await readFile("./gql/schema.gql", "utf8")
  await ensureAndWriteFile("bin/schema.js", schemaJs(schema, cloud))
  await ensureAndWriteFile(jsSrc, indexJs(specName, simplePath, cloud, graphQLServer?.build?.cloudFnOptions))
  const prodJsOutputs = await makeProdJs({
    src: jsSrc,
    exclude: ["electron", "./graphql-server-node"],
    external: ["apollo-server-cloud-functions", "apollo-server-lambda", "firebase-functions", "node-fetch", "@supabase/supabase-js", "@sendgrid/mail"]
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

const indexJs = (specName: string, specPath: string, cloud: Cloud, cloudFnOptions: CloudFnOptions = {}) => {
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

  if (cloud === null) {
    return dedent`
      const { ApolloServer, gql } = require("apollo-server-lambda")
  
      const typeDefs = gql\`
        type Query {
          hello: String
        }
      \`;
      
      const resolvers = {
        Query: {
          hello: (parent, args, context) => {
            return "Hello, world!";
          }
        }
      };
      
      const server = new ApolloServer({
        typeDefs,
        resolvers
      });
      
      const apolloHandler = server.createHandler();
      
      exports.handler = (event, context) => {
        if (!event.requestContext) {
          event.requestContext = context;
        }
        return apolloHandler(event, context);
      }
    `
  }

  return dedent`
    import { typeDefs } from "./schema.js"
    import { ${specName} } from "./${specPath}.js"
    
    import { ApolloServer } from "${apolloCloudLib[cloud]}"
    ${cloud === "firebase" ? "import functions from \"firebase-functions\"" : ""}
    
    const server = new ApolloServer({ 
      typeDefs, 
      resolvers: ${specName}.resolvers,
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
      node: "17"
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
  },
  netlify: {
    name: "functions",
    engines: {
      node: "17"
    },
    type: "module",
    main: "hello.js",
    dependencies: {
      "apollo-server-lambda": "^3.10.0",
      graphql: "15.8.0",
      lit: "^2.0.0",
      "node-fetch": "3"
    },
    private: true
  }
}
