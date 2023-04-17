import { FieldKey, fieldKeys, IncludeExclude, Meta, Meta$, MetaFn, metafy, MetaModel, reset } from "metaliq"
import { LogFunction, startUp, Up, up, UpOptions } from "@metaliq/up"

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
   * Application setup process hook for top-level meta.
   * Runs after data initialisation and metafication.
   *
   * If no bootstrap function is provided, the process continues by
   * recursing through the inner model's bootstrap terms until a function is found and run,
   * at which point recursion on that branch halts.
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

export interface ApplicationState<T> {
  /**
   * Localised `up` function that is available when `local` has been set to true in the model.
   */
  up?: Up<Meta<T>>
}

export interface Application$<T, P = any> {
  /**
   * Create an event handler that calls the given meta function
   * for this meta value and its associated data.
   *
   * The resulting event handling is wrapped in an Update and performed with `up`
   * so that it is "wrapped" into the application cycle.
   */
  up?: (metaFn: MetaFn<T, P>, options?: UpOptions) => (message?: any) => any
}

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends ApplicationTerms<T, P> {}

    interface State<T, P> extends ApplicationState<T> {
      this?: State<T, P>
    }
  }

  interface Meta$<T, P> extends Application$<T, P> {}
}

export type InitFunction<T> = ((model?: MetaModel<T>) => T) | ((model?: MetaModel<T>) => Promise<T>)
export type Init<T> = T | InitFunction<T>

Meta$.prototype.up = function (metaFn, options) {
  return up(($, event) => metaFn($.value, $, event), this, options)
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
  bootstrap(meta.$.value, meta.$)

  return meta
}

/**
 * Get the initial value from the MetaModel's `init` provider.
 */
export async function init<T> (model: MetaModel<T>, options: IncludeExclude<T> = {}): Promise<T> {
  if (typeof model.init === "function") {
    const data = await (model.init as InitFunction<T>)(model)
    return data
  } else if (typeof model.init !== "undefined") {
    return model.init
  } else {
    const keys = fieldKeys(model, options)
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
}

/**
 * Bootstrap a Meta$.
 *
 * If no boostrap specified, the process will recurse along each child branch
 * to the point where one is found and bootstrap at that level.
 *
 * Each separate child bootstrap is run with `up`,
 * in order to support intermediate review points.
 */
export const bootstrap: MetaFn<any> = async (v, $) => {
  if (typeof $.model.bootstrap === "function") {
    $.up($.model.bootstrap)
  } else {
    for (const key of fieldKeys($.model)) {
      bootstrap($.child$(key))
    }
  }
}

/**
 * Run the bootstrap function of a child.
 *
 * Typically used from within a parent model to cascade bootstrapping to selected children.
 */
export const bootstrapChild = <T>(key: FieldKey<T>): MetaFn<T> => async (v, $) => {
  const child$ = $.child$(key)
  const childBootstrap = child$.model.bootstrap
  if (typeof childBootstrap === "function") {
    const result = await child$.fn(childBootstrap)
    return result
  }
}
