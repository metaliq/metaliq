import { up, UpOptions } from "@metaliq/up"
import { FieldKey, Meta$, MetaFn } from "metaliq"
import { as } from "@metaliq/util"
import { GraphQLResponse, GraphQLResponseCondition } from "graphqlex"
import { VALIDATION } from "@metaliq/validation"

/**
 * Policy registration.
 */
export const INTEGRATION = () => {}
VALIDATION()

export { validate } from "@metaliq/validation"

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
  op?: <I> (
    operation: Operation<I, T>,
    options?: UpOptions & OperationOptions<T, I>
  ) => (event?: any) => any
}

export type Operation<I, O> = (input?: I) => Promise<GraphQLResponse<O>>

export type OperationOptions <T, I = any> = {
  /**
   * Operation input, such as the vars for a query.
   * If this is not provided then the data value of the meta to which the operation is applied
   * will be the input value, with any surplus fields not existing in the operation's
   * defined input type being pruned away.
   */
  input?: I

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
  onResponse?: MetaFn<T, any, ResponseHandler<T>>

  /**
   * Progress message to display during the call.
   */
  message?: string

  /**
   * The default behaviour of `op` when the both the provided value and received result
   * are object data types is to apply the received object onto
   * the initially provided object on a key-for-key basis,
   * leaving any keys that are not defined in the
   * received result intact in the provided object.
   *
   * To override this behaviour with a straightforward reassignment of the whole object,
   * set `overwrite` to `true`.
   */
  overwrite?: boolean
}

export type ResponseHandler <T> = (response: GraphQLResponse<T>) => any

export const defaultOperationOptions: OperationOptions<any> = {
  linkFieldErrors: true
}

declare module "metaliq" {
  interface Meta$<T, P> extends Integration$<T, P> {}
}

Meta$.prototype.op = function (operation, options) {
  return up(async ($, event) => {
    await $.fn(op(operation, options))
  }, this, options)
}

/**
 * A message display function. A good fit for `showMessage` from the `@metaliq/modals` policy.
 * Can be initialised with {@link handleResponseErrors}.
 */
let showMessage: (msg: string, title?: string) => any = () => {}

/**
 * A progress display function. A good fit for `showProgress` from the `@metaliq/modals` policy.
 * Can be initialised with {@link handleResponseErrors}.
 */
let showProgress: (msg: string, title?: string) => any = () => {}

export const op = <I, O> (
  operation: Operation<I, O>, options: OperationOptions<O, I> = {}
): MetaFn<O> => async (v, $) => {
    if (options.message) showProgress?.(options.message)
    const input = options.input ?? as<I>($.value)
    options = { ...defaultOperationOptions, ...options }
    const response = await operation(input)
    // Operation-level response handling option
    if (options.onResponse) {
      await $.fn(options.onResponse)(response)
    }
    // Assign response data back into local graph
    const isObject = (x: any) => typeof x === "object" && !Array.isArray(x)
    if (isObject($.value) && isObject(response.data)) {
      Object.assign($.value, response.data) // TODO: Consider recursive
    } else {
      $.value = response.data
    }
    // Handle any reported field-level errors
    if (options.linkFieldErrors) {
      for (const err of response.graphQLErrors || []) {
        const path = err.path
        let err$: Meta$<any> = $
        while (path.length && err$) {
          err$ = err$.child$(path.shift() as FieldKey<O>)
        }
        if (err$) err$.state.error = err.message
      }
    }
    showProgress?.("", "")
  }

/**
 * Provide this function as `onResponse` when initialising Api to get basic error handling.
 *
 * This handler optionally initialises functions to provide user information and progress,
 * which are a good fit for `showMessage` and `showProgress` from the modals UI policy.
 *
 * Wrap this function as necessary to add further handling of response status, headers, etc.
 */
export const handleResponseErrors = (
  showMessageFunction?: (msg: string, title?: string) => any,
  showProgressFunction?: (msg: string, title?: string) => any
) => {
  if (showMessage) showMessage = showMessageFunction
  if (showProgress) showProgress = showProgressFunction

  return (response: GraphQLResponse) => {
    if (![
      GraphQLResponseCondition.OK, GraphQLResponseCondition.FieldError
    ].includes(response.condition)) {
      showMessage([
        `GraphQL call could not be completed: ${response.condition}.`,
        "See console for more details."
      ].join("\n"), "GraphQL Error")
      console.log(response.condition, "\n\nGraphQLResponse:", response)
      up()().catch(console.error)
      if (response.error) throw response.error
      if (response.condition === GraphQLResponseCondition.RequestError) throw new Error("GraphQL Request Error")
    }
  }
}
