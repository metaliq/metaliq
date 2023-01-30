import { Route, RouteHandler, Router } from "./router"
import { $fn, child$, FieldKey, fieldKeys, fns, getAncestorTerm, Meta$, MetaFn, metaSetups, MetaModel } from "metaliq"
import { MaybeReturn } from "@metaliq/util"
import { up } from "@metaliq/up"

export * from "./router"

export { ApplicationTerms } from "@metaliq/application"

export interface NavigationTerms<T, P = any, RP extends object = any, RQ = any> {
  /**
   * Route object associated with this MetaModel.
   */
  route?: Route<RP, RQ>

  /**
   * Meta functions for application navigation events.
   */
  onEnter?: MetaFn<T, P, RouteHandler<RP, RQ>>
  onLeave?: MetaFn<T, P, RouteHandler<RP, RQ>>

  /**
   * Initial path for a top level MetaModel,
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
    interface Terms<T, P> extends NavigationTerms<T, P> {}

    interface State<T, P> {
      this?: State<T, P>
      nav?: NavigationState<T>
    }
  }
}

/**
 * Policy-level state store.
 */
type NavigationPolicy = {
  /**
   * A map of routes to their associated Meta$.
   */
  route$s: Map<Route<object>, Meta$<any>>

  /**
   * The selected route's Meta$.
   */
  selectedRoute$: Meta$<any>
}
const policy: NavigationPolicy = {
  route$s: new Map(),
  selectedRoute$: null
}

/**
 * Obtain the Meta$ associated with the given route.
 */
export const route$ = (route: Route<object>) => policy.route$s.get(route)

metaSetups.push($ => {
  const model = $.model
  // If this model has a route, initialise any route handling functions
  if (model?.route) {
    policy.route$s.set(model.route, $)
    if (typeof model.onLeave === "function") {
      model.route.onLeave = async () => {
        const result = await model.onLeave($.value, $)
        return result
      }
    }
    model.route.onEnter = async (params) => {
      if (typeof model.onEnter === "function") {
        const routeResult = await model.onEnter($.value, $)(params)
        if (routeResult === false) return false
      }
      const navType = getAncestorTerm("navType")($.value, $)
      if (typeof navType?.onNavigate === "function") {
        const navTypeResult = navType.onNavigate($.value, $)
        if (navTypeResult === false) return false
      }
    }
  }
  // If this is a nav container, set initial selection
  if ($.model.navType) {
    $.state.nav = $.state.nav || { selected: null }
    $.state.nav.selected = fieldKeys($.model)[0]
  }
  // If this is the top-level meta and has routes specified then initialise navigation
  if (!$.parent) {
    if (model?.urlPath &&
      typeof history !== "undefined" && typeof window !== "undefined" &&
      (!window.location?.pathname || window.location.pathname === "/")
      // Only use initially specified path if one isn't already in the browser location
    ) {
      history.pushState(null, null, model.urlPath)
    }
    if (policy.route$s.size) {
      $.model.bootstrap = fns([$.model.bootstrap, () => {
        // Extend any existing bootstrap to initialise the Router
        const router = new Router(
          Array.from(policy.route$s.keys()),
          () => up()()
        ).start()
        router.catch(console.error)
      }])
    }
  }
})

/**
 * Convenience method to map all nodes of a navigation model
 * to the same underlying data object.
 */
export const mapNavData = <M, N> (data: M, navModel?: MetaModel<N>) => {
  navModel = navModel || this as MetaModel<N>
  const navData = {} as N
  const keys = fieldKeys(navModel)
  for (const key of keys) {
    const childModel = navModel.fields?.[key] as unknown as MetaModel<unknown>
    const childKeys = fieldKeys(childModel)
    // Continue recursing if there are nested-level routes
    const grandChildModels = childKeys.map(ck => childModel.fields[ck]) as Array<MetaModel<unknown>>
    const hasGrandChildRoutes = grandChildModels.some(s => s.route)
    const keyModel = hasGrandChildRoutes
      ? mapNavData(data, childModel)
      : data
    Object.assign(navData, { [key]: keyModel })
  }
  return navData
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
export const setNavSelection: MetaFn<any> = $fn((v, $) => {
  let recursing = false

  // Clear any lower selections
  const recurseChildren: MetaFn<any> = (v, $) => {
    if ($.state.nav) {
      delete $.state.nav.selected
    }
    for (const key of fieldKeys($.model)) {
      const c$ = child$($, key)
      recurseChildren(c$.value, c$)
    }
  }

  // Set any upper selections
  const recurseParent: MetaFn<any> = (v, $) => {
    const parent$ = $.parent?.$
    if (!recursing) policy.selectedRoute$ = $
    if (parent$) {
      parent$.state.nav = parent$.state.nav || {}
      parent$.state.nav.selected = $.key
      if (parent$.state.nav.showMenu) {
        parent$.state.nav.showMenu = false
      }
      recursing = true
      recurseParent(parent$.value, parent$)
    }
  }

  recurseChildren(v, $)
  recurseParent(v, $)
})

/**
 * Go to the given nav node's route if it has one,
 * otherwise find and go to its first child route.
 */
export const goNavRoute = (item$: Meta$<any>) => {
  while (item$ && !item$.model.route) {
    const firstChildKey = fieldKeys(item$.model)[0]
    item$ = child$(item$, firstChildKey)
  }
  item$.model.route?.go()
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
