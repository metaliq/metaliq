import { Route, RouteHandler, Router } from "./router"
import { fieldKeys, Meta, metaCall, MetaFn, metaSetups, MetaSpec } from "../../meta"
import { MaybeReturn } from "../../util/util"
import { up } from "@metaliq/up"

export { route } from "./router"

export interface NavigationSpec<T, P = any, RP extends object = any, RQ = any> {
  /**
   * Route object associated with this specification.
   */
  route?: Route<RP, RQ>

  /**
   * Meta functions for application navigation events.
   */
  onEnter?: MetaFn<T, P, RouteHandler<RP, RQ>>
  onLeave?: MetaFn<T, P, RouteHandler<RP, RQ>>

  /**
   * Initial path for the top level spec,
   * if one is not already present in the browser location.
   */
  urlPath?: string

  /**
   * Navigation type.
   * This is set at the parent level to define the mechanism for navigating between children.
   */
  navType?: NavigationType
}

export type NavigationType = {
  onNavigate?: (to: Meta<any>) => MaybeReturn<boolean>
}

export interface NavigationState {
  /**
   * Field key of the currently selected option in this navigation level.
   */
  selected?: string
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends NavigationSpec<T, P> {}

    interface State<T, P> {
      this?: State<T, P>
      nav?: NavigationState
    }
  }
}

type NavigationPolicy = {
  routeMetas: Map<Route<object>, Meta<any>>
}
const policy: NavigationPolicy = {
  routeMetas: new Map()
}

export const routeMeta = (route: Route<object>) => policy.routeMetas.get(route)

metaSetups.push(meta => {
  const spec = meta.$.spec
  // If this spec has a route, initialise any route handling functions
  if (spec?.route) {
    policy.routeMetas.set(spec.route, meta)
    if (typeof spec.onLeave === "function") {
      spec.route.onLeave = metaCall(spec.onLeave)(meta)
    }
    spec.route.onEnter = async (pathParams, query) => {
      if (typeof spec.onEnter === "function") {
        const routeResult = await metaCall(spec.onEnter)(meta)(pathParams, query)
        if (routeResult === false) return false
      }
      const navType = meta.$.parent?.$.spec.navType
      if (typeof navType?.onNavigate === "function") {
        const navTypeResult = navType.onNavigate(meta)
        if (navTypeResult === false) return false
      }
    }
  }
  // If this is a nav container, set initial selection
  if (meta.$.spec.navType) {
    meta.$.state.nav = meta.$.state.nav || { selected: null }
    meta.$.state.nav.selected = fieldKeys(meta.$.spec)[0]
  }
  // If this is the top-level meta and has routes specified then initialise navigation
  if (!meta.$.parent) {
    if (spec?.urlPath &&
      typeof history !== "undefined" && typeof window !== "undefined" &&
      (!window.location?.pathname || window.location.pathname === "/")
      // Only use initially specified path if one isn't already in the browser location
    ) {
      history.pushState(null, null, spec.urlPath)
    }
    if (policy.routeMetas.size) {
      const router = new Router(
        Array.from(policy.routeMetas.keys()),
        () => { up()() }
      ).start()
      router.catch(console.error)
    }
  }
})

/**
 * Convenience method to map all nodes of a navigation model
 * to the same underlying logical model.
 */
export const mapNavModel = <T, M> (model: M) => (spec?: MetaSpec<T>) => {
  spec = spec || this as MetaSpec<T>
  const navModel = {} as T
  for (const key of fieldKeys(spec)) {
    const childSpec = spec.fields?.[key] as unknown as MetaSpec<unknown>
    const keyModel = childSpec.fields
      ? mapNavModel(model)(childSpec)
      : model
    Object.assign(navModel, { [key]: keyModel })
  }
  return navModel
}

export const selectItem = (meta: Meta<any>) => {
  const parent = meta.$.parent
  if (parent?.$.spec.navType) {
    parent.$.state.nav.selected = meta.$.key
    selectItem(parent)
  }
}

export const freeNavigation: NavigationType = {
  onNavigate: selectItem
}
