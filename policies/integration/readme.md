# @metaliq/integration

MetaliQ's core integration policy is based on the GraphQL standard for schema-based APIs. It is designed to support a number of integration strategies:

* Connect to an associated back-end - possibly built using `@metaliq/graphql-server`
* Connect to a third-party (public or partner) API published using GraphQL
* Connect to a system component or service that has a GraphQL capability, such as:
  * Supabase
  * FaunaDB
  * Neo4J
  * ...etc.

This module provides a number of capabilities around developing GraphQL client applications. If you wish to create a GraphQL server, then use the `@metaliq/graphql-server` publication target module. That target in turn uses several of the capabilities provided by this integration policy, including generation of suitable types for schema-based service resolvers.

For non-GraphQL integration needs, there are various options:

* Direct integration code within application processes (e.g. `fetch` from REST URL and process results)
* Wrap the integration in a cloud function and provide client facade with `@metaliq/graphql-server`

The latter is a good option when accessing commercial APIs with secure keys and credentials, when wishing to maintain secure cross-service access logs, or when needing to access and include sensitive intermediate data. These types of facades can proxy and aggregate 3rd party services, which themselves might be GraphQL or another format such as REST or SOAP.

The features of this module are:

* Provide MetaModel terms to configure a GraphQL application
  * Service URL
  * Local schema location
  * Location of a concrete "operations" file
* Provide a facility to update the local schema definition from a remote API
* Support client-side GraphQL operation calls with multi-stage error handling
* Generate client-side Tyepscript code from a GraphQL schema
  * Types matching schema types and operations
  * Resolvers matching schema operations and types (used for server development)
  * Functions providing a type-safe facade to all concrete operations defined within a local GraphQL file
* Provide an update process factory `gUp` that links a GraphQL operation directly to the Meta graph

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
gUp(searchCustomersQuery, { search: app.searchString }, app.customers)
```

The above code could be attached to a button click, for example, and would handle all aspects of calling the GraphQL query with the appropriate parameter from the local data model, handling various types of error appropriately, allocating the result back into the local data model and performing any configured application review (such as updating a reactive front-end if used with the `@metaliq/presentation` policy). Similarly, the following code could be attached to a Save button:

```typescript
gUp(saveCustomerMutation, app.customer)
```

As well as saving the customer (and integrating any changes made by the service itself), this saves a lot of techno-boilerplate code, and highlights the organisational intent.

If you need greater control than provided by `gUp`, you can use the type-safe operations facade directly and handle the response data yourself, whilst still getting the benefit of a type-safe API with error handling and automatic input type marshalling.

