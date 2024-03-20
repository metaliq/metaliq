import { Route, RouteParams, Router } from "./router"
import { FieldKey, fieldKeys, Meta$, meta$, MetaFn, MetaModel, metaSetups, onDescendants, root$ } from "metaliq"
import { catchUp } from "@metaliq/up"
import { APPLICATION, bootstrapComplete } from "@metaliq/application"

export * from "./router"

/**
 * Policy registration.
 */
export const NAVIGATION = () => {}
APPLICATION()

export interface NavigationTerms<T, P = any, RP extends object = any, RQ = any> {
  /**
   * Set this term on any parent node within the navigation structure
   * to define the basic navigation handling within that node.
   *
   * The MetaFn should expect to receive the selected navigation node and behave accordingly.
   *
   * This policy provides several standard functions {@link setNavSelection} which is
   * a basic handler allowing free navigation between all the immediate child nodes.
   * Alternative behaviours such as step-by-step wizard navigation
   * can be provided by other policies.
   */
  onNavigate?: MetaFn<any>

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
  onEnter?: MetaRouteHandler<T, P, RP, RQ>

  /**
   * Set this term on a leaf node within the navigation structure
   * in order to perform any post-processing, such as remote data persistence.
   * If the function returns the boolean value `false` navigation will be cancelled.
   */
  onLeave?: MetaRouteHandler<T, P, RP, RQ>

  /**
   * Initial path for a top level MetaModel,
   * if one is not already present in the browser location.
   */
  urlPath?: string

  /**
   * Indicate that a navigation item should NOT be included in a menu system.
   * This item will still be able to be navigated to using its route,
   * allowing for pages that are "hidden" within the navigation menu structure
   * but accessible via their route (for example a detail link in a list view)
   * and through deep-linking URLs.
   */
  offMenu?: boolean
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

  /**
   * A toggle set on and off separately from selected state
   * and used for menu level collapsed / expanded.
   */
  expandMenu?: boolean
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

export type MetaRouteHandler<T, P = any, RP = any, RQ = any> =
  (params?: RouteParams<RP, RQ>) => MetaFn<T, P>

/**
 * Policy-level state store.
 */
type NavigationPolicy = {
  /**
   * The router instance, can be used for pausing navigation behaviour for example.
   */
  router?: Router

  /**
   * Used to collect routes from meta setups for use in Router initialisation.
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

// Handle async updates within route handler that is NOT wrapped in `up`
const handleRouteResult = async (result: any) => {
  if (result instanceof Promise) {
    catchUp()
    result = await result
  }
  return result
}

metaSetups.push($ => {
  const model = $.model
  // If this model has a route, initialise any route handling functions
  if (model?.route) {
    policy.route$s.set(model.route, $)
    if (typeof model.onLeave === "function") {
      model.route.onLeave = async () => {
        const result = await handleRouteResult(model.onLeave()($.value, $))
        return result
      }
    }
    model.route.onEnter = async (params) => {
      if (typeof model.onEnter === "function") {
        const result = await handleRouteResult(model.onEnter(params)($.value, $))
        if (result === false) return false
      }
      const onNavigate = $.raw("onNavigate", true)
      if (typeof onNavigate === "function") {
        const navTypeResult = onNavigate($.value, $)
        if (navTypeResult === false) return false
      }
    }
  }
  // If this is a nav container, set initial selection
  if ($.model.onNavigate) {
    $.state.nav = $.state.nav || { selected: null }
  }
  // If this is the top-level meta and has routes specified then initialise navigation
  if (!$.parent$) {
    if (model?.urlPath &&
      typeof history !== "undefined" && typeof window !== "undefined" &&
      (!window.location?.pathname || window.location.pathname === "/")
      // Only use initially specified path if one isn't already in the browser location
    ) {
      history.pushState(null, null, model.urlPath)
    }
    if (policy.route$s.size) {
      // Extend any existing bootstrap to initialise the Router
      const origBootstrap = $.model.bootstrap
      $.model.bootstrap = async (v, $) => {
        const origResult = await $.fn(origBootstrap)
        bootstrapComplete.then(() => {
          policy.router = new Router(Array.from(policy.route$s.keys()), catchUp)
          policy.router.start().catch(console.error)
        })
        return origResult
      }
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
 * Get the meta$ for the current selection in the given ancestor navigation meta$.
 *
 * By default, this is a recursive function that returns the innermost (leaf) selection.
 * Pass option `{ recurse: false }` to find the immediate child selection at the level of the
 * provided meta value and no deeper.
 */
export const getNavSelection = ($: Meta$<any>, {
  recurse = true,
  mustHave = null
}: {
  /**
   * By default navigation selections are followed recursively through the graph.
   * Specify `recurse: false` to find the selection at the current level and no deeper.
   */
  recurse?: boolean
  /**
   * Specify a synchronous condition to `mustHave` in order to return
   * the last ancestor of a potentially deeper selection that meets this condition.
   */
  mustHave?: MetaFn<any>
} = {}) => {
  $ = $.child$($.state.nav?.selected)
  const isMustHave = typeof mustHave === "function"
  let have$ = $
  if (recurse) {
    while ($?.state.nav?.selected) {
      $ = $.child$($.state.nav?.selected)
      if (isMustHave && $.fn(mustHave)) {
        have$ = $
      }
    }
  }
  return isMustHave ? have$ : $
}

/**
 * Clears the current navigation selection,
 * then sets the provided node as the currently selected node in its parent
 * and recursively applies this selection through any further ancestry
 * in the navigation structure.
 *
 * Suitable as an {@link NavigationTerms.onNavigate} term value.
 */
export const setNavSelection: MetaFn<any> = (v, $ = meta$(v)) => {
  $.state.nav ||= {}
  if (!$.state.nav.expandMenu) {
    $.state.nav.expandMenu = true
  } else if ($.state.nav.selected) {
    $.state.nav.expandMenu = false
  }

  policy.selectedRoute$ = $

  const clearSelection: MetaFn<any> = (v, $) => {
    if ($.state.nav) {
      delete $.state.nav.selected
    }
  }

  $.fn(root$).fn(onDescendants(clearSelection))

  // Set any upper selections
  const setParentSelection: MetaFn<any> = (v, $) => {
    const parent$ = $.parent$
    if (parent$) {
      parent$.state.nav = parent$.state.nav || {}
      parent$.state.nav.selected = $.key
      setParentSelection(parent$.value, parent$)
    }
  }

  setParentSelection(v, $)
}

/**
 * Returns a MetaFn that closes the menu for the given navigation item
 * if the screen width is below a specified width.
 *
 * Usually not used directly, but referenced via {@link setNavSelectionResponsive}.
 */
export const closeMenuResponsive = (width: number): MetaFn<any> => (v, $ = meta$(v)) => {
  if (typeof document === "object" && document.body?.clientWidth < width) {
    $.fn(root$).fn(onDescendants((v, $) => {
      if ($.state.nav?.showMenu) {
        $.state.nav.showMenu = false
      }
    }))
  }
}

/**
 * A responsive version of setNavSelection which also closes the menu
 * if the screen size is below a given width.
 *
 * Suitable as an {@link NavigationTerms.onNavigate} term value.
 */
export const setNavSelectionResponsive = (width: number): MetaFn<any> => (v, $) => {
  $.fn(setNavSelection)
  $.fn(closeMenuResponsive(width))
}

/**
 * Go to the given nav node's route if it has one,
 * otherwise find and go to its first child route.
 *
 * Don't need to wrap call to this fn in `up`
 * as the path change handler will call `up`.
 * So this function provides some of `up`s capabilities,
 * such as preventing event defaults and bubbling.
 *
 */
export const goNavRoute: MetaFn<any> = (v, item$, event) => {
  while (item$ && !item$.model.route) {
    const firstChildKey = item$.childKeys()[0]
    item$ = item$.child$(firstChildKey)
  }
  if (item$.model.route?.router?.enabled) {
    event?.preventDefault()
    event?.stopPropagation()
    item$?.model.route?.go()
  }
}

export const toggleMenu: MetaFn<any> = (v, $) => {
  $.state.nav = $.state.nav || {}
  $.state.nav.showMenu = !$.state.nav.showMenu
}

export const openMenu: MetaFn<any> = (v, $) => {
  $.state.nav = $.state.nav || {}
  $.state.nav.showMenu = true
}

export const closeMenu: MetaFn<any> = (v, $) => {
  $.state.nav = $.state.nav || {}
  $.state.nav.showMenu = false
}

/**
 * Return false if any parent of the given item has state `showMenu === false`.
 * Otherwise return true.
 * Useful for controlling menu items in a "partially" closable (e.g. minimisable) menu.
 */
export const isMenuShown: MetaFn<any> = (_, item$: Meta$<any>) => {
  while (item$) {
    item$ = item$.parent$
    if (item$?.state?.nav?.showMenu === false) return false
  }
  return true
}

/**
 * Use in a route handler to redirect to a different route.
 */
export const redirect = (route: Route<any>, params?: any): MetaFn<any> => () => {
  route.go(params)
  return false // Prevents further handling on the original route
}

/**
 * Make a route handler that calls the given handler, passing the child
 * of the current meta node with the given key.
 *
 * Useful where parent and child navigation items share a similar
 * behaviour for e.g. onEnter.
 *
 * For example, given a nav structure for contacts with a parent item
 * that displays a summary view and child item that displays a detail view
 * of the same contact data object:
 *
 * ```
 *   contact: {
 *     label: v => `Summary for ${v.detail.fullName}`
 *     route: route("/contacts/:contactId"),
 *     onEnter: onChild(loadContact, "detail"),
 *     view: field("detail", contactSummary)
 *     fields: {
 *       detail: {
 *         label: v => `Detail for ${v.fullName}`
 *         route: ("contacts/:contactId/detail"),
 *         onEnter: loadContact,
 *         view: contactDetail
 *       }
 *     }
 *   }
 * ```
 */
export const onChild = <T, P, RP, RQ, K extends FieldKey<T>> (
  handler: MetaRouteHandler<T[K], T, RP, RQ>,
  key: K
) => (p: RouteParams<RP, RQ>): MetaFn<T, P> => (v, $) => handler(p)(v[key], $.child$(key))

export const disableNav = () => {
  policy.router?.stop()
}

export const enableNav = () => {
  policy.router?.start()
}
