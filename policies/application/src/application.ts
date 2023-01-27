import { Meta, MetaFn, metafy, MetaModel, reset } from "metaliq"
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

  /**
   * Collection of application-defined hooks for integration etc.
   */
  actions?: ApplicationActions<T, P>
}

export interface ApplicationState<T> {
  /**
   * Localised `up` function that is available when `local` has been set to true in the spec.
   */
  up?: Up<Meta<T>>
}

/**
 * Application actions is an extensible interface to link processes
 * such as data persistence, file uploads and other downstream integration
 * tasks into defined application interaction points such as "save", "delete", "refresh" etc.
 */
export interface ApplicationActions<T, P> {
  this?: ApplicationActions<T, P>
}

declare module "metaliq" {
  namespace Policy {
    interface Specification<T, P> extends ApplicationSpec<T, P> {}

    interface State<T, P> extends ApplicationState<T>{
      this?: State<T, P>
    }
  }
}

export type InitFunction<T> = ((spec?: MetaModel<T>) => T) | ((spec?: MetaModel<T>) => Promise<T>)
export type Init<T> = T | InitFunction<T>

/**
 * Run a spec - initialise its data value and set `up`
 * state transition management with any specified logging.
 */
export async function run<T> (specOrMeta: MetaModel<T> | Meta<T>) {
  let spec: MetaModel<T>
  let meta: Meta<T>
  // Determine whether a spec or an initialised meta was passed
  if (typeof (<any>specOrMeta).$ === "object") {
    meta = specOrMeta as Meta<T>
    spec = meta.$.spec
  } else {
    spec = specOrMeta as MetaModel<T>
    const value = await initSpecValue(spec)
    meta = metafy(spec, value)
  }

  const log = spec.log || false
  const local = spec.local || false
  const up = await startUp({
    review: async () => {
      reset(meta.$)
      if (typeof spec.review === "function") {
        await spec.review(meta.$.value, meta.$)
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

/**
 * Get the initial value from the specification's `init` provider.
 */
export async function initSpecValue<T> (spec: MetaModel<T>): Promise<T> {
  const data: T = typeof spec.init === "function"
    ? await (spec.init as InitFunction<T>)(spec)
    : spec.init ?? {} as T

  return data
}
