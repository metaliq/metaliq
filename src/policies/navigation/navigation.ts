import { Route, Router } from "./router"
import { Meta, metaProc, MetaProc, metaSetups, Process } from "../../meta"
import { up } from "@metaliq/up"
import { metaAppInitializers } from "../application/application"

export interface NavigationSpec<T, P = any> {
  /**
   * Route processing for this spec.
   */
  routes?: Array<RouteProc<T, P>>
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
export type RouteProc<T, P = any> = [Route<any>, Process<T, P>]

/**
 * Internal policy state.
 */
type NavigationPolicy = {
  // Internal registry of specified routes against their metas.
  routeMetas: Array<RouteMetaProcMeta<any>>
}
type RouteMetaProcMeta<T, P = any> = [Route<any>, MetaProc<T, P>, Meta<T, P>]
const policy: NavigationPolicy = { routeMetas: [] }

metaSetups.push(meta => {
  const spec = meta.$.spec
  if (spec.routes) {
    for (const [route, proc] of meta.$.spec.routes || []) {
      policy.routeMetas.push([route, metaProc(proc), meta])
    }
  }
})

metaAppInitializers.push(async (meta: Meta<any>) => {
  const spec = meta.$.spec
  if (spec.path) history.pushState(null, null, spec.path)
  if (spec.routes) {
    await initRoutes()
  }
})

export async function initRoutes () {
  for (const [route, proc, meta] of policy.routeMetas) {
    route.on = (p, q) => proc(meta, { ...p, ...q })
  }

  const noop = () => {}
  await new Router(policy.routeMetas.map(([route]) => route), up(noop)).start()
}
