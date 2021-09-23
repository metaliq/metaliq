export interface GraphQLConfig {
  schemaUrl?: string
}

declare module "../../policy" {
  namespace Policy {
    interface Configuration extends GraphQLConfig {}
  }
}
