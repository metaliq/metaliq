import { Route, RouteHandler, Router } from "./router"
import { child$, FieldKey, fieldKeys, fns, getAncestorTerm, m$, Meta$, MetaFn, metaSetups, MetaSpec } from "metaliq"
import { MaybeReturn } from "@metaliq/util"
import { up } from "@metaliq/up"

export { route } from "./router"

export { ApplicationSpec } from "@metaliq/application"

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
  onNavigate?: MetaFn<any, any, MaybeReturn<boolean>>
}

export interface NavigationState<T> {
  /**
   * Field key of the currently selected option in this navigation level.
   */
  selected?: FieldKey<T>

  /**
   * For dynamically shown menus.
   */
  showMenu?: boolean
}

declare module "metaliq" {
  namespace Policy {
    interface Specification<T, P> extends NavigationSpec<T, P> {}

    interface State<T, P> {
      this?: State<T, P>
      nav?: NavigationState<T>
    }
  }
}

type NavigationPolicy = {
  routeMetas: Map<Route<object>, Meta$<any>>
  selectedRoute$: Meta$<any>
}
const policy: NavigationPolicy = {
  routeMetas: new Map(),
  selectedRoute$: null
}

export const routeMeta = (route: Route<object>) => policy.routeMetas.get(route)

metaSetups.push($ => {
  const spec = $.spec
  // If this spec has a route, initialise any route handling functions
  if (spec?.route) {
    policy.routeMetas.set(spec.route, $)
    if (typeof spec.onLeave === "function") {
      spec.route.onLeave = async () => {
        const result = await spec.onLeave($.value, $)
        return result
      }
    }
    spec.route.onEnter = (params) => {
      up(async () => {
        let routeResult
        if (typeof spec.onEnter === "function") {
          routeResult = await spec.onEnter($.value, $)(params)
          if (routeResult === false) return false
        }
        const navType = getAncestorTerm("navType")($.value, $)
        if (typeof navType?.onNavigate === "function") {
          const navTypeResult = navType.onNavigate($.value, $)
          if (navTypeResult === false) return false
        }
        return routeResult
      })()
    }
  }
  // If this is a nav container, set initial selection
  if ($.spec.navType) {
    $.state.nav = $.state.nav || { selected: null }
    $.state.nav.selected = fieldKeys($.spec)[0]
  }
  // If this is the top-level meta and has routes specified then initialise navigation
  if (!$.parent) {
    if (spec?.urlPath &&
      typeof history !== "undefined" && typeof window !== "undefined" &&
      (!window.location?.pathname || window.location.pathname === "/")
      // Only use initially specified path if one isn't already in the browser location
    ) {
      history.pushState(null, null, spec.urlPath)
    }
    if (policy.routeMetas.size) {
      $.spec.bootstrap = fns([$.spec.bootstrap, () => {
        // Extend any existing bootstrap to initialise the Router
        const router = new Router(
          Array.from(policy.routeMetas.keys())
        ).start()
        router.catch(console.error)
      }])
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
  const keys = fieldKeys(spec)
  for (const key of keys) {
    const childSpec = spec.fields?.[key] as unknown as MetaSpec<unknown>
    const childKeys = fieldKeys(childSpec)
    const keyModel = childKeys?.length
      ? mapNavModel(model)(childSpec)
      : model
    Object.assign(navModel, { [key]: keyModel })
  }
  return navModel
}

/**
 * Get the Meta object for the current selection in the given navigation level.
 */
export const getNavSelection = <T>(navMeta$: Meta$<T>) => {
  const key: FieldKey<T> = navMeta$.state.nav?.selected
  return child$(navMeta$, key)
}

/**
 * Recursively set the navigation meta state.
 */
export const setNavSelection: MetaFn<any> = (v, $ = m$(v)) => {
  let recursing = false

  const recurse: MetaFn<any> = (v, $) => {
    const parent$ = $.parent?.$
    if (!recursing) policy.selectedRoute$ = $
    if (parent$) {
      parent$.state.nav = parent$.state.nav || {}
      parent$.state.nav.selected = $.key
      if (parent$.state.nav.showMenu) {
        parent$.state.nav.showMenu = false
      }
      recursing = true
      recurse(parent$.value, parent$)
    }
  }

  recurse(v, $)
}

/**
 * Go to the given nav node's route if it has one,
 * otherwise find and go to its first child route.
 * This will in turn trigger any onNavigation, such as `selectMenuItem`.
 */
export const goNavRoute = (item$: Meta$<any>) => {
  const route = getAncestorTerm("route")(item$.value, item$)
  route?.go()
}

export const freeNavigation: NavigationType = {
  onNavigate: setNavSelection
}

export const toggleMenu = ($: Meta$<any>) => {
  $.state.nav = $.state.nav || {}
  $.state.nav.showMenu = !$.state.nav.showMenu
}

export const openMenu = ($: Meta$<any>) => {
  $.state.nav = $.state.nav || {}
  $.state.nav.showMenu = true
}

export const closeMenu = ($: Meta$<any>) => {
  $.state.nav = $.state.nav || {}
  $.state.nav.showMenu = false
}
