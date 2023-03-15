import { Meta, Meta$, MetaFn, metafy, MetaModel, reset } from "metaliq"
import { LogFunction, startUp, Up, up, UpOptions } from "@metaliq/up"

/**
 * Policy module to define general model and operation of a Metaliq application.
 * This establishes an update and review mechanism.
 */

export interface ApplicationTerms<T, P = any> {
  /**
   * Data initialisation term, containing
   * initial value or a function (sync/async) to return the initial value.
   * Not recursive unless internally implemented.
   */
  init?: Init<T>

  /**
   * Application setup process hook for top-level meta.
   * Runs after data initialisation and metafication.
   * Not recursive unless internally implemented.
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
    const value = await initModelValue(model)
    meta = metafy(model, value)
  }

  const log = model.log || false
  const local = model.local || false
  const up = await startUp({
    review: async () => {
      reset(meta.$)
      if (typeof model.review === "function") {
        await model.review(meta.$.value, meta.$)
      }
    },
    log,
    local
  })
  if (typeof model.bootstrap === "function") {
    await model.bootstrap(meta.$.value, meta.$)
  }
  await up()()

  return meta
}

/**
 * Get the initial value from the MetaModel's `init` provider.
 */
export async function initModelValue<T> (model: MetaModel<T>): Promise<T> {
  const data: T = typeof model.init === "function"
    ? await (model.init as InitFunction<T>)(model)
    : model.init ?? {} as T

  return data
}
