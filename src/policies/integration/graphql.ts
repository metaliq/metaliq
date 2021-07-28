export interface GraphQLSpec {
  schemaUrl?: string
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends GraphQLSpec {
      this?: Specification<T, P>
    }
  }
}
