import { Route, RouteHandler, Router } from "./router"
import {
  $fn,
  FieldKey,
  fieldKeys,
  fns,
  getAncestorTerm,
  Meta$,
  MetaFn,
  metaSetups,
  MetaModel,
  onDescendants, root$
} from "metaliq"
import { MaybeReturn } from "@metaliq/util"
import { up } from "@metaliq/up"

export * from "./router"

export { ApplicationTerms } from "@metaliq/application"

export interface NavigationTerms<T, P = any, RP extends object = any, RQ = any> {
  /**
   * Set this term on any parent node within the navigation structure
   * to define the basic navigation behaviour within that node.
   *
   * The MetaFn should expect to receive the selected navigation node and behave accordingly.
   *
   * This policy provides several standard functions `setNavSelection` which is
   * a basic behaviour allowing free navigation between all the immediate child nodes.
   * Alternative behaviours such as step-by-step wizard navigation
   * can be provided by other policies.
   */
  onNavigate?: MetaFn<any, any, MaybeReturn<boolean>>

  /**
   * Define a route term for each "leaf" node in the navigation structure,
   * as well as any parent nodes that need a navigation entry themselves.
   */
  route?: Route<RP, RQ>

  /**
   * Set this term on a leaf node within the navigation structure
   * in order to perform any pre-processing, such as remote data loading.
   * If the function returns the boolean value `false` navigation will be cancelled.
   */
  onEnter?: MetaFn<T, P, RouteHandler<RP, RQ>>

  /**
   * Set this term on a leaf node within the navigation structure
   * in order to perform any post-processing, such as remote data persistence.
   * If the function returns the boolean value `false` navigation will be cancelled.
   */
  onLeave?: MetaFn<T, P, RouteHandler<RP, RQ>>

  /**
   * Initial path for a top level MetaModel,
   * if one is not already present in the browser location.
   */
  urlPath?: string
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
      const onNavigate = $.fn(getAncestorTerm("onNavigate", false))
      if (typeof onNavigate === "function") {
        const navTypeResult = onNavigate($.value, $)
        if (navTypeResult === false) return false
      }
    }
  }
  // If this is a nav container, set initial selection
  if ($.model.onNavigate) {
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
      $.model.bootstrap = fns(
        $.model.bootstrap,
        () => {
          // Extend any existing bootstrap to initialise the Router
          const router = new Router(
            Array.from(policy.route$s.keys()),
            () => up()()
          ).start()
          router.catch(console.error)
        }
      )
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
  return navMeta$.child(key)
}

/**
 * Clears the current navigation selection,
 * then sets the provided node as the currently selected node in its parent
 * and recursively applies this selection through any further ancestry
 * in the navigation structure.
 *
 * Suitable as an {@link NavigationTerms.onNavigate} term value.
 */
export const setNavSelection: MetaFn<any> = $fn((v, $) => {
  policy.selectedRoute$ = $

  const clearSelection: MetaFn<any> = (v, $) => {
    if ($.state.nav) {
      delete $.state.nav.selected
    }
  }

  onDescendants(clearSelection)(root$($))

  // Set any upper selections
  const setParentSelection: MetaFn<any> = (v, $) => {
    const parent$ = $.parent
    if (parent$) {
      parent$.state.nav = parent$.state.nav || {}
      parent$.state.nav.selected = $.key
      if (parent$.state.nav.showMenu) {
        // parent$.state.nav.showMenu = false
      }
      setParentSelection(parent$.value, parent$)
    }
  }

  setParentSelection(v, $)
})

/**
 * Returns a MetaFn that closes the menu for the given navigation item
 * if the screen width is below a specified width.
 *
 * Usually not used directly, but referenced via {@link setNavSelectionResponsive}.
 */
export const closeMenuResponsive = (width: number): MetaFn<any> => $fn((v, $) => {
  if (typeof window === "object" && window.outerWidth < width) {
    onDescendants((v, $) => {
      if ($.state.nav?.showMenu) {
        $.state.nav.showMenu = false
      }
    })(root$($))
  }
})

/**
 * A responsive version of setNavSelection which also closes the menu
 * if the screen size is below a given width.
 *
 * Suitable as an {@link NavigationTerms.onNavigate} term value.
 */
export const setNavSelectionResponsive = (width: number) =>
  fns(setNavSelection, closeMenuResponsive(width))

/**
 * Go to the given nav node's route if it has one,
 * otherwise find and go to its first child route.
 */
export const goNavRoute = (item$: Meta$<any>) => {
  while (item$ && !item$.model.route) {
    const firstChildKey = fieldKeys(item$.model)[0]
    item$ = item$.child(firstChildKey)
  }
  item$.model.route?.go()
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

/**
 * Return false if any parent of the given item has state `showMenu === false`.
 * Otherwise return true.
 * Useful for controlling menu items in a "partially" closable (e.g. minimisable) menu.
 */
export const isMenuShown = (item$: Meta$<any>) => {
  while (item$) {
    item$ = item$.parent
    if (item$?.state?.nav?.showMenu === false) return false
  }
  return true
}
