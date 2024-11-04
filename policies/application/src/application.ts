import { modelKeys, IncludeExclude, Meta, Meta$, MetaFn, metafy, MetaModel, reset, MetaFnTerm } from "metaliq"
import { LogFunction, startUp, up, UpOptions } from "@metaliq/up"

/**
 * Policy registration.
 */
export const APPLICATION = () => {}

/**
 * Policy module to define general model and operation of a Metaliq application.
 * This establishes an update and review mechanism.
 */

export interface ApplicationTerms<T, P = any> {
  /**
   * Data initialisation term, containing
   * initial value or a function (sync/async) to return the initial value.
   *
   * If no init term is present, the value is composed by
   * recursing through inner models' init terms until a value is returned,
   * at which point recursion on that branch halts.
   */
  init?: Init<T>

  /**
   * A place to define any necessary setup processing.
   * Runs after data initialisation and metafication.
   * Typically used for loading further initial data via
   * asynchronous service interactions, and is different from `init` in that
   * bootstrap functions are run in the context of `up` and its review mechanism,
   * supporting things like message / progress display etc.
   *
   * If a bootstrap function returns the value `false` then there is no recursive
   * bootstrapping of its descendent models.
   *
   * Otherwise the process continues by
   * recursing through the inner model's bootstrap terms.
   */
  bootstrap?: MetaFn<T, P>

  /**
   * Log function to be called on each update - passed as `log` to `up`.
   */
  log?: boolean | LogFunction<Meta<T>>

  /**
   * Review function to be called after each update - passed as `review` to `up`.
   */
  review?: MetaFn<T, P>

  /**
   * Flag to create a localised context with state updates isolated from the rest of an application.
   */
  local?: boolean
}

export interface Application$<T, P = any> {
  /**
   * Create an event handler that calls the given meta function
   * for this meta value and its associated data.
   *
   * The resulting event handling is wrapped in an Update and performed with `up`
   * so that it is "wrapped" into the application cycle.
   */
  up?: (metaFn?: MetaFnTerm<T, P>, options?: UpOptions) => (message?: any) => Promise<any>
}

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends ApplicationTerms<T, P> {}
  }

  interface Meta$<T, P> extends Application$<T, P> {}
}

export type InitFunction<T> = ((model?: MetaModel<T>) => T) | ((model?: MetaModel<T>) => Promise<T>)
export type Init<T> = T | InitFunction<T>

Meta$.prototype.up = function (metaFnTerm, options) {
  const metaUpdate = (metaFn: MetaFn<any>) =>
    ($: any, event: any) => metaFn($.value, $, event)

  if (Array.isArray(metaFnTerm)) {
    return up(metaFnTerm.map(metaUpdate), this, options)
  } else {
    return up(metaUpdate(metaFnTerm), this, options)
  }
}

/**
 * Run a MetaModel - initialise its data value and set `up`
 * state transition management with any specified logging.
 */
export async function run<T> (modelOrMeta: MetaModel<T> | Meta<T>) {
  let model: MetaModel<T>
  let meta: Meta<T>
  // Determine whether a model or an initialised meta was passed
  if (typeof (<any>modelOrMeta).$ === "object") {
    meta = modelOrMeta as Meta<T>
    model = meta.$.model
  } else {
    model = modelOrMeta as MetaModel<T>
    const value = await init(model)
    meta = metafy(model, value)
  }

  const log = model.log || false
  const local = model.local || false
  await startUp({
    review: async () => {
      reset(meta.$)
      if (typeof model.review === "function") {
        await model.review(meta.$.value, meta.$)
      }
    },
    log,
    local
  })
  await bootstrap(meta.$.value, meta.$)
  bootstrapPromiseResolve(true)

  return meta
}

/**
 * Get the initial value from the MetaModel's `init` provider.
 */
export async function init<T> (model: MetaModel<T>, options: IncludeExclude<T> = {}): Promise<T> {
  if (typeof model.init === "function") {
    return await (model.init as InitFunction<T>)(model)
  } else if (typeof model.init !== "undefined") {
    return model.init
  } else {
    return await initFields(model, options)
  }
}

/**
 * Runs initialisation on each of the model's child fields and returns the resulting object.
 * Useful where a parent model needs to set its own values but also include the result of
 * descendant inits, or to override some aspect of its initialised descendant data,
 * for example by sharing a value between children, like:
 *
 * ```ts
 *  init: model => {
 *    const sharedList = []
 *    const data = await initFields(model)
 *    data.someValue = "hello"
 *    data.someChild.list = sharedList
 *    data.otherChild.list = sharedList
 *    return data
 *  }
 * ```
 */
export async function initFields<T> (model: MetaModel<T>, options: IncludeExclude<T> = {}): Promise<T> {
  const keys = modelKeys(model, options)
  if (keys?.length) {
    const data = {} as any
    for (const key of keys) {
      const fieldData = await init(model.fields[key])
      if (typeof fieldData !== "undefined") {
        data[key] = fieldData
      }
    }
    return data as T
  } else {
    return undefined
  }
}

let bootstrapPromiseResolve: (value: unknown) => void
/**
 * An exported promise enabling processes to await full application boostrap.
 */
export const bootstrapComplete = new Promise((resolve) => {
  bootstrapPromiseResolve = resolve
})

/**
 * Bootstrap a Meta$.
 *
 * Bootstrapping is parent-first recursive unless a parent bootstrap function returns `false`,
 * in which case nested bootstrapping is not performed for that branch of the meta graph.
 *
 * Each separate child bootstrap is run with `up`,
 * in order to support intermediate review points.
 *
 * Returns true if a bootstrap was performed.
 */
export const bootstrap: MetaFn<any> = async (v, $) => {
  let bootstrapped = false
  let recurse = true
  if (typeof $.model.bootstrap === "function") {
    recurse = await $.up($.model.bootstrap)()
    bootstrapped = true
  }
  if (recurse !== false) {
    for (const key of $.fieldKeys()) {
      const nestedBootstrap = await $.field$(key)?.fn(bootstrap)
      if (nestedBootstrap) bootstrapped = true
    }
  }
  if (!bootstrapped && !$.parent$) {
    // No bootstrap function was called, do a direct `up` call to start first review
    await up()()
  }
  return bootstrapped
}
