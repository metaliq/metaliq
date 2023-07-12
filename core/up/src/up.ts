/**
 * ```
 *     _   _ ___
 *   / / / / __ \
 *  / /_/ / /_/ /
 *  \____/  ___/
 *      /_/
 *```
 *
 * A simple, reactive, framework-agnostic, local/global,
 * message-driven application state mechanism.
 *
 */

/**
 * A function that returns a message or event handler for the given update function and data,
 * that will trigger the `review` function of its associated context at well-defined points.
 * These are:
 *
 * * Upon completion of a synchronous update
 * * Prior to first asynchronous stage of an update
 * * Upon final promise resolution of an asynchronous update
 * * For all similar points of any subsequent (chained) updates
 *
 * An update function can return a chain of further updates to perform as an array of:
 *
 * * update function references, in which case the same data is passed along the chain, or
 * * objects of the form ({ update, data }), or
 * * tuples of the form [update, data].
 *
 * In any case, the result of the final update (or only update if no chain is returned)
 * is returned as the overall result of the call to `up`, for use in any further processing.
 */
export type Up<T> = (update?: Update<T>, data?: T, options?: UpOptions) => (message?: any) => Promise<any>

/**
 * A function that updates data, optionally accepting a message such as the event that triggered it.
 */
export type Update<T> = (data?: T, message?: any) => any

/**
 * Options for defining subsequent processing of a browser event after being handled by `up`.
 * Options default to false, i.e. the case where everything is handled within update functions.
 */
export type UpOptions = {
  /**
   * Carry out browser default action (e.g. form submit).
   */
  doDefault?: boolean

  /**
   * Propagate upwards through element hierarchy.
   */
  propagate?: boolean

  /**
   * Used internally to flag chained updates.
   */
  isChained?: boolean
}

/**
 * A state context for the global app or a local context.
 */
export type UpContext = {
  /**
   * A sync or async function that is called at well-defined points from each update.
   * For example, a global-state Lit app could re-render the view:
   * `review: () => render(view(model), document.body)`
   */
  review?: (...params: any[]) => any

  /**
   * An optional logging function (sync or async) that is called on each update,
   * or `true` to use console.log.
   * If not specified there is no logging.
   */
  log?: boolean | LogFunction<any>

  /**
   * Whether to assign the module level `up` function to this context.
   * If `local` is set to true, the module level `up` function is not assigned.
   * This is used for creating non-global update scopes, for example within a specific component.
   */
  local?: boolean
}

export type LogFunction<T> = (entry: LogEntry<T>) => any

/**
 * The values that will be sent to any specified logging function.
 */
export type LogEntry<T> = {
  /**
   * Name of update function.
   */
  name?: string

  /**
   * Timestamp.
   */
  time?: Date

  /**
   * Indicates the completion of initial sync stage of an async update.
   */
  isPromised?: boolean

  /**
   * Indicates a chained update initiated as result of prior update.
   */
  isChained?: boolean

  /**
   * The update function
   */
  update?: Update<T>

  /**
   * Data provided to update
   */
  data?: T

  /**
   * Message / event that triggered the update
   */
  message?: any
}

/**
 * The `up` function for the global app context,
 * typically used to prepare event handlers for a UI.
 *
 * Example of usage in a Lit template:
 *
 * ```
 * import { up } from "@metaliq/up"
 * import { html } from "lit"
 *
 * const addItem = (list: string[]) {
 *   list.push(`Item added at ${new Date()}`)
 * }
 *
 * export const listView = (list: string[]) => html`
 *   <ul>
 *     ${list.map(item => html` <li>${item}</li> `)}
 *   </ul>
 *   <button @click=${up(addItem, list)}>Add an Item</button>`
 * ```
 *
 * The `up` function can also be called within regular code,
 * but remember to add additional parentheses to trigger the
 * returned message handler.
 * For example, to run an async load process for an application model,
 * with rendering before (e.g. "Loading...") and after completion,
 * call it with `up` like this:
 *
 * ```
 * up(bootstrap, model)()
 * ```
 */
export let up: <T> (update?: Update<T>, data?: T, options?: UpOptions) => (message?: any) => Promise<any>
// Note: `up` effectively redefines `Up` type here.
// Typing it as Up<any> means losing type information on T, and thus type checking between update and data types.

/**
 * Initiate an `up` function for the given context.
 *
 * If the UpContext.local setting is omitted or set to false
 * the result is also assigned to the module level `up` function.
 * This is standard practice for global-state apps.
 *
 * If `context.local` is set to true then the promised `up` function
 * is local to the provided context and no global reference to it is exported.
 * This enables components and frameworks to create multiple,
 * separate reactive update containers.
 *
 * Example: to bootstrap a typical lit app with console logging:
 * ```
 * import { start } from "@metaliq/up"
 * import { render } from "lit"
 * import { view, model } from "./my-app-content"
 *
 * startUp({
 *   review () { render(view(model), document.body) },
 *   log: true
 * })
 *```
 */
export const startUp = async (context: UpContext): Promise<Up<any>> => {
  const log: LogFunction<any> = context.log === true
    ? console.log
    : typeof context.log === "function"
      ? context.log
      : () => {}

  const started: Up<any> = (
    update, data, { doDefault = false, propagate = false, isChained = false } = {}
  ) => async (message) => {
    doDefault || message?.preventDefault?.()
    propagate || message?.stopPropagation?.()

    const entry: LogEntry<any> = {
      name: update?.name,
      time: new Date(),
      isPromised: false,
      isChained,
      update,
      data,
      message
    }

    let result: any
    try {
      // Log and perform update
      await log(entry)
      result = update?.(data, message)
    } catch (e) {
      // Catch any update error, review (for example to display error state) and rethrow to halt the chain
      await context.review?.()
      throw e
    }

    if (result instanceof Promise) {
      // Review and log after initial stage, then await the promised result
      await context.review?.()
      await log({ ...entry, time: new Date(), isPromised: true })
      try {
        result = await result
      } catch (e) {
        // Catch any update error, review (for example to display error state) and rethrow to halt the chain
        await context.review?.()
        throw e
      }
    }
    // Review after update
    await context.review?.(data)

    // Handle update chaining
    if (Array.isArray(result)) {
      const opts: UpOptions = { isChained: true }
      for (const chained of result) {
        if (typeof chained === "function") {
          // Simple function reference
          result = await started(chained, data, opts)(message)
        } else if (Array.isArray(chained) && typeof chained[0] === "function") {
          // Tuple of the form [update, data?]
          result = await started(chained[0], chained[1], opts)(message)
        } else if (typeof chained?.update === "function") {
          // Object of the form { update, data? }
          result = await started(chained.update, chained.data, opts)(message)
        }
      }
    }

    // Pass the final result of the update to the caller of `up` for possible further use
    return result
  }

  // Assign the global `up` reference
  if (!context.local) up = started

  // Return the created `up` function for local usage
  return started
}

/**
 * A convenience function to do a pseudo-synchronous call to `up`.
 * Useful for situations where not all updates can be wrapped in `up`.
 */
export const catchUp = () => {
  up()().catch(console?.error)
}
