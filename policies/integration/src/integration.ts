import { up, UpOptions } from "@metaliq/up"
import { Meta$, MetaFn } from "metaliq"
import { as } from "@metaliq/util"
import { GraphQLResponse, ApiOptions, GraphQLResponseCondition } from "graphqlex"

export interface IntegrationTerms <T, P = any> {
  /**
   * When defined on a top-level MetaModel,
   */

  apis?: ApiOptions[]

  /**
   * The main API URL.
   */
  apiUrl?: string
  // TODO: Consider support multi-api usage in this policy.
  // Position now is to use schema-stitching,
  // but would be good to provide alternative.

  /**
   * Default response handler.
   * Enables global handling of errors, statuses, headers etc.
   * Also enables you to decide whether or not to `throw` errors
   * and thus halt processing chains.
   */
  onResponse?: MetaFn<T, P, ResponseHandler<T>>
}

export interface Integration$ <T, P> {
  this?: Meta$<T, P>

  /**
   * Create an event handler that performs the given operation
   * (typically an integration query or mutation)
   * directly, without needing to wrap in a MetaFn or Update.
   *
   * The operation will be passed either:
   * (a) any provided parameters object (e.g. query params) or
   * (b) the associated data value itself (e.g. a mutation)
   * and in either case will apply the returned value back into
   * the associated data value.
   *
   * The resulting event handling is wrapped in an Update and performed with `up`
   * so that it is "wrapped" into the application cycle.
   */
  op?: <I> (operation: Operation<I, T>, input?: I, options?: UpOptions) => (message?: any) => any
}

export type Operation<I, O> = (input?: I) => Promise<GraphQLResponse<O>>

export type OperationOptions <T, P = any> = {
  /**
   * By default, any field errors in the operation result
   * are applied to the associated meta state.
   *
   * This can be turned off by specifying `linkFieldErrors: false`.
   */
  linkFieldErrors?: boolean

  /**
   * Custom additional response hook.
   * This will be called prior to the default global response hook,
   * so it can handle pre-processing of error messages, for example.
   */
  onResponse?: MetaFn<T, P, ResponseHandler<T>>
}

export type ResponseHandler <T> = (response: GraphQLResponse<T>) => any

export const defaultOperationOptions: OperationOptions<any> = {
  linkFieldErrors: true
}

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends IntegrationTerms<T, P> { }
  }

  interface Meta$<T, P> extends Integration$<T, P> {}
}

Meta$.prototype.op = function (operation, input, options) {
  return up(async ($, event) => {
    await $.fn(op(operation, input))
  }, this)
}

export const op = <I, O> (
  operation: Operation<I, O>, input?: I, options: OperationOptions<O> = {}
): MetaFn<O> => async (v, $) => {
    // TODO: How to distinguish between an operation that takes no parameters and one which takes the data graph value
    // Test: should be OK with parameterless generated function, as there's nothing to pass
    input = input ?? as<I>($.value)
    options = { ...defaultOperationOptions, ...options }
    // TODO: Call pass in and handle custom onResponse handler
    const response = await operation(input)
    $.value = response.data
    // TODO: Apply graphql field errors
  }

/**
 * Provide this function as `onResponse` when initialising Api to get basic error handling.
 *
 * This handler optionally takes a function to provide user information,
 * which is a good fit for `showMessage` from the modals UI policy.
 *
 * Wrap this function as necessary to add further handling of response status, headers, etc.
 */
export const handleResponseErrors = (showMessage: (msg: string) => any = () => {}) =>
  (response: GraphQLResponse) => {
    if (![
      GraphQLResponseCondition.OK, GraphQLResponseCondition.FieldError
    ].includes(response.condition)) {
      showMessage([
        `GraphQL call could not be completed: ${response.condition}.`,
        "See console for more details."
      ].join("\n"))
      console.log(response.condition, "\n\nGraphQLResponse:", response)
      if (response.error) throw response.error
    }
  }
