import { Meta, Meta$, MetaFn, metafy, MetaSpec, reset } from "metaliq"
import { LogFunction, startUp, Up } from "@metaliq/up"

/**
 * Policy module to define general specification and operation of a Metaliq application.
 * This establishes an update and review mechanism.
 */

export interface ApplicationSpec<T, P = any> {
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
  bootstrap?: MetaFn<T>

  /**
   * Log function to be called on each update - passed as `log` to `up`.
   */
  log?: boolean | LogFunction<Meta<T>>

  /**
   * Review function to be called after each update - passed as `review` to `up`.
   */
  review?: MetaFn<T, P> | Array<MetaFn<T, P>>

  /**
   * Flag to create a localised context with state updates isolated from the rest of an application.
   */
  local?: boolean
}

export interface ApplicationState<T> {
  /**
   * Localised `up` function that is available when `local` has been set to true in the spec.
   */
  up?: Up<Meta<T>>
}

declare module "metaliq/lib/policy" {
  namespace Policy {
    interface Specification<T, P> extends ApplicationSpec<T, P> {}

    interface State<T, P> extends ApplicationState<T>{
      this?: State<T, P>
    }
  }
}

export type InitFunction<T> = ((spec?: MetaSpec<T>) => T) | ((spec?: MetaSpec<T>) => Promise<T>)
export type Init<T> = T | InitFunction<T>

/**
 * Run a spec - initialise its data value and set `up`
 * state transition management with any specified logging.
 */
export async function run<T> (specOrMeta: MetaSpec<T> | Meta<T>) {
  let spec: MetaSpec<T>
  let meta: Meta<T>
  // Determine whether a spec or an initialised meta was passed
  if (typeof (<any>specOrMeta).$ === "object") {
    meta = specOrMeta as Meta<T>
    spec = meta.$.spec
  } else {
    spec = specOrMeta as MetaSpec<T>
    const value = await initSpecValue(spec)
    meta = metafy(spec, value)
  }

  const log = spec.log || false
  const local = spec.local || false
  const up = await startUp({
    review: () => {
      reset(meta.$)
      if (Array.isArray(spec.review)) {
        for (const eachReview of spec.review) {
          eachReview(meta.$.value, meta.$)
        }
      } else if (typeof spec.review === "function") {
        spec.review(meta.$.value, meta.$)
      }
    },
    log,
    local
  })
  if (typeof spec.bootstrap === "function") {
    await spec.bootstrap(meta.$.value, meta.$)
  }
  await up()()

  return meta
}

export async function initSpecValue<T> (spec: MetaSpec<T>): Promise<T> {
  const data: T = typeof spec.init === "function"
    ? await (spec.init as InitFunction<T>)(spec)
    : spec.init ?? {} as T

  return data
}

export const extendBootstrap = <T, P = any> ($: Meta$<T, P>, metaFn: MetaFn<T, P>) => {
  const bootstrap = $.spec.bootstrap || (() => {})
  $.spec.bootstrap = async (v, $) => {
    await bootstrap(v, $)
    await metaFn(v, $)
  }
}
