import { Route, RouteHandler, Router } from "./router"
import { metaCall, MetaFn, metaSetups } from "../../meta"
import { up } from "@metaliq/up"

export { route } from "./router"

export interface NavigationSpec<T, P = any, C = any> {
  /**
   * Route processing for this spec.
   *
   */
  routes?: Array<MetaRoute<T, P, C, any, any>>
  /**
   * An initial path from the application base URL for this spec.
   */
  path?: string
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P, C> extends NavigationSpec<T, P, C> {}
  }
}

/**
 * Function which takes a meta and returns a route handler.
 */
export type MetaRouteHandler<T, P, C, RP extends object, RQ> = MetaFn<T, P, C, RouteHandler<RP, RQ>>

/**
 * Tuple associating a route and its meta route handler.
 */
export type MetaRoute<T, P, C, RP extends object, RQ> = [Route<RP, RQ>, MetaRouteHandler<T, P, C, RP, RQ>]

metaSetups.push(meta => {
  const spec = meta.$.spec
  if (spec.routes && !meta.$.parent) {
    // If this is the top-level meta and has routes specified then initialise navigation
    if (spec.path && typeof history !== "undefined" && typeof window !== "undefined" &&
      (!window.location?.pathname || window.location.pathname === "/")
    ) {
      // Only use initially specified path if one isn't already in the browser location
      history.pushState(null, null, spec.path)
    }
    for (const [route, metaHandler] of spec.routes || []) {
      route.on = metaCall(metaHandler)(meta)
    }
    const router = new Router(spec.routes.map(([route]) => route), () => { up()() }).start()
    router.catch(console.error)
  }
})
