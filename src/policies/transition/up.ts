/**
 * ```
 *     _   _ ___
 *   / / / / __ \
 *  / /_/ / /_/ /
 *  \____/  ___/
 *      /_/
 *```
 *
 * A simple, local/global, framework-agnostic, event-driven,
 * reactive application state mechanism.
 *
 */

/**
 * A function that returns an event handler for the given update function and data,
 * that will trigger the `review` function of its associated context at well-defined points.
 * These are:
 *
 * * Upon completion of a synchronous update
 * * Prior to first asynchronous stage of an update
 * * Upon final promise resolution of an asynchronous update
 * * For all similar points of any subsequent (chained) updates
 *     that are returned as either:
 *   * A single update
 *   * An array of updates
 *
 * Subsequent update(s) may be specified as a single function reference
 * in which case the same data is passed along the chain,
 * or as an object of the form ({ update, data }),
 * or as a tuple of the form [update, data].
 * Any other update result type will be ignored, hence the return type `any`.
 */
export type Up<T> = (update?: Update<T>, data?: T, options?: UpOptions) => (event?: Event) => any

/**
 * A function that updates data, optionally accepting the event that triggered it.
 */
export type Update<T> = (data?: T, event?: Event) => any

/**
 * Options for defining subsequent browser processing of the event after being handled by `up`.
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
   * An optional logging function (sync or async) that is called from each update,
   * or `true` to use console.log.
   * If not specified there is no logging.
   */
  log?: boolean | ((entry: LogEntry<any>) => any)

  /**
   * Whether to assign the module level `up` function to this context.
   * If `local` is set to true, the module level `up` function is not assigned.
   * This is used for creating non-global update scopes, for example within a specific component.
   */
  local?: boolean

  /**
   * An optional update to be performed immediately to initialise the context.
   */
  init?: Update<any>
}

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
   * Event that triggered the update
   */
  event?: Event
}

/**
 * The `up` function for the global app context,
 * typically used to prepare event handlers for a UI.
 *
 * Example of usage in a Lit template:
 *
 * ```
 * import { up } from "@klaudhaus/up"
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
 * returned event handler.
 * For example, to run an async load process for an application model,
 * with rendering before (e.g. "Loading...") and after completion,
 * call it with `up` like this:
 *
 * ```
 * up(bootstrap, model)()
 * ```
 */
export let up: Up<any>

/**
 * Initiate an `up` function for the given context.
 *
 * If the UpContext.local setting is omitted or set to false
 * the result is also assigned to the module level `up` function.
 * This is standard practice for global-state apps.
 *
 * If `context.local` is set to true then the promised `up` function
 * is local to the provided context and no global reference to it is exported.
 * This is useful for components with internal nested state.
 *
 * Example: to bootstrap a typical Lit app with console logging:
 * ```
 * import { start } from "@klaudhaus/up"
 * import { render } from "lit"
 * import { view, model } from "./my-app-content"
 *
 * start({
 *   review () { render(view(model), document.body) },
 *   log: true
 * })
 *```
 */
export const start = async (context: UpContext): Promise<Up<any>> => {
  const log = context.log === true
    ? console.log
    : typeof context.log === "function"
      ? context.log
      : () => {}

  const started: Up<any> = (
    update, data, { doDefault = false, propagate = false, isChained = false } = {}
  ) => async (event) => {
    doDefault || event?.preventDefault?.()
    propagate || event?.stopPropagation?.()

    const entry: LogEntry<any> = {
      name: update?.name,
      time: new Date(),
      isPromised: false,
      isChained,
      update,
      data,
      event
    }

    let result: any
    try {
      // Log and perform update
      await log(entry)
      result = update?.(data, event)
    } catch (e) {
      // Catch any update error, review (for example to display error state) and rethrow to halt the chain
      await context.review?.()
      throw e
    }

    if (result instanceof Promise) {
      // Review and log after initial stage, then await the promised result
      await context.review?.()
      await log({ ...entry, time: new Date(), isPromised: true })
      result = await result
    }
    // Review after update
    context.review?.()

    // Handle update chaining
    if (!Array.isArray(result) || typeof result[0] === "function") {
      // Normalize any chained results to an array
      result = [result]
    }
    const opts: UpOptions = { isChained: true }
    for (const chained of result) {
      if (typeof chained === "function") {
        // Simple function reference
        started(chained, data, opts)
      } else if (Array.isArray(chained) && typeof chained[0] === "function") {
        // Tuple of the form [update, data?]
        started(chained[0], chained[1], opts)
      } else if (typeof chained?.update === "function") {
        // Object of the form { update, data? }
        started(chained.update, opts)
      }
    }
  }

  // Assign the global `up` reference
  context.local || (up = started)
  // Run any initial update
  await started(context.init)()
  // Return the created `up` function for local usage
  return started
}
