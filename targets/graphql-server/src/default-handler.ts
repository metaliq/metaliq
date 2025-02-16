import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"

export const defaultHandler = async (server: ApolloServer, port: number = 8940) => {
  const { url } = await startStandaloneServer(server, {
    listen: { port }
  })
  console.log(`GraphQL server running at ${url} port ${port}`)
}
