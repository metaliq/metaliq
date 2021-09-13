import { fieldKeys, Meta, metafy, MetaSpec } from "../../meta"
import { LogFunction, startUp, Up } from "../transition/up"
import { initRoutes } from "../navigation/navigation"

/**
 * Policy module to define general specification and operation of a Metaliq application.
 * This establishes an update and review mechanism.
 */

export interface ApplicationSpec<T> {
  /**
   * Initial value or a function to return the initial value.
   * Initialisers will be applied recursively within the spec,
   * with the data structure initialised for the outermost spec
   * before then setting values from inner spec initialisers.
   */
  init?: Init<T>

  /**
   * Log function to be called on each update - passed as `log` to `up`.
   */
  log?: boolean | LogFunction<Meta<T>>

  /**
   * Review function to be called after each update - passed as `review` to `up`.
   */
  review?: Review

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

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends ApplicationSpec<T> {
      this?: Specification<T, P>
    }

    interface State<T, P> extends ApplicationState<T>{
      this?: State<T, P>
    }
  }
}

export type InitFunction<T> = (() => T) | (() => Promise<T>)
export type Init<T> = T | InitFunction<T>
export type Review = (meta: Meta<any>) => any

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

  const review = async () => {
    await spec.review(meta)
  }
  const log = spec.log || false
  const local = spec.local || false
  await startUp({ review, log, local })

  // TODO: Add a postStart hook to delegate to navigation
  if (spec.path) history.pushState(null, null, spec.path)
  if (spec.routes) {
    await initRoutes()
  }
  return meta
}

async function initSpecValue<T> (spec: MetaSpec<T>): Promise<T> {
  const data: T = typeof spec.init === "function"
    ? await (spec.init as InitFunction<T>)()
    : spec.init ?? {} as T

  // Recursively allocate the values of any nested initialisations
  for (const key of fieldKeys(spec)) {
    const fieldSpec = spec.fields[key]
    if (fieldSpec.init) {
      const fieldData = await initSpecValue(fieldSpec)
      data[key] = fieldData
    }
  }
  return data
}
