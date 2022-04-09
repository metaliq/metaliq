import { fieldKeys, Meta, metaCall, MetaFn, metafy, MetaSpec } from "../../meta"
import { LogFunction, startUp, Up } from "@metaliq/up"

/**
 * Policy module to define general specification and operation of a Metaliq application.
 * This establishes an update and review mechanism.
 */

export interface ApplicationSpec<T, P = any, C = any> {
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
  review?: MetaFn<T, P, C> | Array<MetaFn<T, P, C>>

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
    interface Specification<T, P, C> extends ApplicationSpec<T, P, C> {}

    interface State<T, P, C> extends ApplicationState<T>{
      this?: State<T, P, C>
    }
  }
}

export type InitFunction<T> = ((spec?: MetaSpec<T>) => T) | ((spec?: MetaSpec<T>) => Promise<T>)
export type Init<T> = T | InitFunction<T>

export async function run<T> (specOrMeta: MetaSpec<T> | Meta<T>): Promise<Meta<T>> {
  let spec: MetaSpec<T>
  let runMeta: Meta<T>
  // Determine whether a spec or an initialised meta was passed
  if (typeof (<any>specOrMeta).$ === "object") {
    runMeta = specOrMeta as Meta<T>
    spec = runMeta.$.spec
  } else {
    spec = specOrMeta as MetaSpec<T>
    const value = await initSpecValue(spec)
    runMeta = metafy(spec, value)
  }

  const log = spec.log || false
  const local = spec.local || false
  const start = await startUp({
    review: (updatedMeta) => {
      recursiveReview(updatedMeta?.$?.parent || updatedMeta)
      review(runMeta)
    },
    log,
    local
  })
  await start()() // Initial call to `up`

  return runMeta
}

export function review <T> (meta: Meta<T>) {
  const specReview = meta?.$?.spec?.review
  if (Array.isArray(specReview)) {
    specReview.forEach(reviewFn => {
      metaCall(reviewFn)(meta)
    })
  } else if (typeof specReview === "function") {
    metaCall(specReview)(meta)
  }
}

export function recursiveReview (meta: Meta<any>) {
  review(meta)
  for (const key of fieldKeys(meta?.$?.spec)) {
    const childMeta = meta[key]
    if (Array.isArray(childMeta)) {
      review(childMeta as unknown as Meta<any>)
      childMeta.forEach(recursiveReview)
    } else {
      recursiveReview(meta[key] as Meta<any>)
    }
  }
}

export function addReview <T> (meta: Meta<T>, review: MetaFn<T>) {
  if (!meta.$.spec.review) {
    meta.$.spec.review = []
  } else if (typeof meta.$.spec.review === "function") {
    meta.$.spec.review = [meta.$.spec.review]
  }
  meta.$.spec.review.push(review)
}

export async function initSpecValue<T> (spec: MetaSpec<T>): Promise<T> {
  const data: T = typeof spec.init === "function"
    ? await (spec.init as InitFunction<T>)(spec)
    : spec.init ?? {} as T

  return data
}
