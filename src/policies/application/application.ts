import { $Fn, Meta, metafy, MetaSpec, reset, IsMeta, Meta$ } from "../../meta"
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
  bootstrap?: $Fn<T>

  /**
   * Log function to be called on each update - passed as `log` to `up`.
   */
  log?: boolean | LogFunction<Meta<T>>

  /**
   * Review function to be called after each update - passed as `review` to `up`.
   */
  review?: $Fn<T, P> | Array<$Fn<T, P>>

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
  let meta: IsMeta<T>
  // Determine whether a spec or an initialised meta was passed
  if (typeof (<any>specOrMeta).$ === "object") {
    meta = specOrMeta as IsMeta<T>
    spec = meta.$.spec as MetaSpec<T>
  } else {
    spec = specOrMeta as MetaSpec<T>
    const value = await initSpecValue(spec)
    meta = metafy(spec, value)
  }

  const log = spec.log || false
  const local = spec.local || false
  const up = await startUp({
    review: () => {
      reset(meta)
      review(meta)
    },
    log,
    local
  })
  if (typeof spec.bootstrap === "function") {
    await spec.bootstrap(meta.$ as Meta$<T>)
  }
  await up()()

  return meta
}

export function review <T> (meta: IsMeta<T>) {
  const specReview = meta?.$?.spec?.review

  if (Array.isArray(specReview)) {
    const specReviews = specReview as Array<$Fn<T>>
    specReviews.forEach(reviewFn => {
      reviewFn(meta.$ as Meta$<T>)
    })
  } else if (typeof specReview === "function") {
    (specReview as $Fn<T>)(meta.$ as Meta$<T>)
  }
}

export function addReview <T> (meta: Meta<T>, review: $Fn<T>) {
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

export const extendBootstrap = <T, P = any> (meta: IsMeta<T, P>, metaFn: $Fn<T, P>) => {
  const bootstrap = meta.$.spec.bootstrap as $Fn<T, P> || (() => {})
  meta.$.spec.bootstrap = async ($: Meta$<T>) => {
    await bootstrap($)
    await metaFn($)
  }
}
