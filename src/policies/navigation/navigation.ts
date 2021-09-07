import { Router, Route } from "./router"
import { initMetaState, Meta, metaMorph, MetaMorph, Morph } from "../../meta"
import { up } from "../transition/up"

export interface NavigationSpec<T, P = any> {
  /**
   * Route processing for this spec.
   */
  routes?: Array<RouteMorph<T, P>>
  /**
   * An initial path from the application base URL for this spec.
   */
  path?: string
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends NavigationSpec<T, P> {}
  }
}

/**
 * Type for the items in the `routes` specification property.
 * Links a defined route with an associated update.
 */
export type RouteMorph<T, P = any> = [Route<any>, Morph<T, P>]

/**
 * Internal policy state.
 */
type NavigationPolicy = {
  // Internal registry of specified routes against their metas.
  routeMetas: Array<RouteMetaMorphMeta<any>>
}
type RouteMetaMorphMeta<T, P = any> = [Route<any>, MetaMorph<T, P>, Meta<T, P>]
const policy: NavigationPolicy = { routeMetas: [] }

initMetaState(meta => {
  for (const [route, morph] of meta.$.spec.routes || []) {
    policy.routeMetas.push([route, metaMorph(morph), meta])
  }
  return {}
})

export function initRoutes () {
  for (const [route, morph, meta] of policy.routeMetas) {
    route.on = (p, q) => morph(meta, { ...p, ...q })
  }

  const noop = () => {}
  new Router(policy.routeMetas.map(([route]) => route), null, up(noop)).start()
}
