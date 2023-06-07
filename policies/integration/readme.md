# @metaliq/integration

## Overview

MetaliQ's core integration policy is based on the GraphQL standard for schema-based APIs. It is designed to support a number of integration strategies:

* Connect to an associated back-end - possibly built using `@metaliq/graphql-server`
* Connect to a third-party (public or partner) API published using GraphQL
* Connect to a system component or service that has a GraphQL capability, such as:
  * Supabase
  * FaunaDB
  * Neo4J
  * ...etc.

For non-GraphQL integration needs, there are various options:

* Direct integration code within application processes (e.g. `fetch` from a REST URL and process the results)
* Wrap the integration in a cloud function and provide a client facade with `@metaliq/graphql-server`

The latter is a good option when accessing commercial APIs with secure keys and credentials, when wishing to maintain secure cross-service access logs, or when needing to access and include sensitive intermediate data. These types of facades can proxy and aggregate 3rd party services, which themselves might be GraphQL or another format such as REST or SOAP.

## Capabilities

This module provides a number of capabilities around developing GraphQL clients - i.e. applications that connect to GraphQL API services. For more information on building GraphQL API service providers themselves, see the documentation for the `@metaliq/graphql-server` publication target module. That target in turn uses several of the capabilities provided by this integration policy, including generation of suitable types for schema-based service resolvers.

### Updating a local GraphQL Schema



In this case, where you're connecting to and developing against an external schema, there are various ways to obtain the schema for inclusion in your local project, but MetaliQ makes this easy with a convenient wrapper around the `get-graphql-schema` utility. The integration policy makes this available via the MetaliQ CLI as follows:

`metaliq get-graphql-schema https://my-service/api gql/schema.gql`

You would typically include this in the scripts section in your `package.json` file.

MetaliQ solutions that connect to a single service often use the conventional schema location of `gql/schema.gql` so it will be set as default if not specified.

`metaliq get-graphql-schema https://my-service/api`

### Generate TypeScript Code

Having authored or obtained a local copy of the GraphQL schema, MetaliQ will then assist you in generating a set of TypeScript source files within the `src/gen` folder location. This location is conventionally ignored from version control using `.gitignore`, as it includes source code which is itself generated from other sources (in this case the GraphQL schema) and thus can always be re-generated. These files are thus not truly original solution source code, but they need to live within the `src` folder for TypeScript compilation reasons.



 



* Provide MetaModel terms to configure one or multiple GraphQL API connections
  * Service URL
  * Local schema location
  * Location of a concrete "operations" file
* Provide a facility to update the local schema definition from a remote API
* Support client-side GraphQL operation calls with multi-stage error handling
* Generate client-side TypeScript code from a GraphQL schema
  * Types matching schema types and operations
  * Resolvers matching schema operations and types (the basis for server-side MetaModels)
  * Functions providing a type-safe facade to all concrete operations defined within a local GraphQL file
* Provide the MetaModel functions `$.op` that links a GraphQL operation directly to the Meta graph

Taken together, it means you can go straight from some GraphQL like this:

```graphql
type Customer {
	id: String
	firstName: String
	lastName: String
}

input CustomerIn {
  id: String
	firstName: String
	lastName: String
}

query {
	fetchCustomers (search: String): Customer[]
}

mutation {
	updateCustomer (customer: CustomerIn): Customer
}
```

and some concrete operations like this:

```graphql
query searchCustomers ($search: String) {
	fetchCustomers (search: $search) {
		id
		firstName
		lastName
	}
}

mutation saveCustomer ($customer: CustomerIn) {
	updateCustomer (customer: $customer): {
		id
		firstName
		lastName
	}
} 
```

to hooking up processes with type-safe code like this, without further boilerplate:

```typescript
$.op(searchCustomersQuery, { search: app.searchString })
```

The above code could be attached to a button click, for example, and would handle all aspects of calling the GraphQL query with the provided parameter, handling various types of error appropriately, allocating the result back into the local data and meta graph and performing any configured application review (such as updating a reactive front-end if used with the `@metaliq/presentation` policy). Similarly, the following code could be attached to a Save button:

```typescript
$.op(saveCustomerMutation)
```

As well as saving the customer (and integrating any changes made by the service itself), this saves a lot of techno-boilerplate code, and emphasises the organisational intent.

If you need greater control than provided by `gUp`, you can use the type-safe operations facade directly and handle the response data yourself, whilst still getting the benefit of a type-safe API with error handling and automatic input type marshalling.

