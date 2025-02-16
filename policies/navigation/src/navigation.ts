import { Route, Router } from "./router"
import { FieldKey, Meta$, MetaFn, MetaFnTerm, MetaModel, metaSetups, modelKeys, onDescendants, root$ } from "metaliq"
import { catchUp } from "@metaliq/up"
import { APPLICATION, bootstrapComplete, init } from "@metaliq/application"
import { option } from "syncpack/dist/option"

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
   * This policy provides a standard function {@link setNavSelection} which is
   * a basic handler allowing free navigation between all the immediate child nodes.
   * Alternative behaviours such as step-by-step wizard navigation
   * can be provided by other policies.
   */
  onNavigate?: MetaFnTerm<any>

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
  onEnter?: MetaRouteHandlerTerm<T, P, RP>

  /**
   * Set this term on a leaf node within the navigation structure
   * in order to perform any post-processing, such as remote data persistence.
   * If the function returns the boolean value `false` navigation will be cancelled.
   */
  onLeave?: MetaRouteHandlerTerm<T, P, RP>

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

/**
 * A route handler for a particular page data type and parent type
 * with optional route parameters type.
 */
export type MetaRouteHandler<T, Parent = any, Params = any, > =
  MetaFn<T, Parent, any, CustomEvent<Params>>

export type MetaRouteHandlerTerm<T, Parent = any, Params = any> =
  MetaRouteHandler<T, Parent, Params> | Array<MetaRouteHandlerTerm<T, Parent, Params>>

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

metaSetups.push($ => {
  const model = $.model
  // If this model has a route, initialise any route handling functions
  if (model?.route) {
    policy.route$s.set(model.route, $)
    if (model.onLeave) {
      model.route.onLeave = async (params) => {
        if (!$.stateValue("disableAsyncLoad")) {
          const result = await $.up(model.onLeave)(new CustomEvent(
            "leave",
            { detail: params }
          ))
          return result
        }
      }
    }
    model.route.onEnter = async (params) => {
      if (!$.stateValue("disableAsyncLoad", true)) {
        if (model.onEnter) {
          const result = await $.up(model.onEnter)(new CustomEvent(
            "enter",
            { detail: params }
          ))
          if (result === false) return false
        }
        const onNavigate = $.raw("onNavigate", true)
        if (onNavigate) {
          const navTypeResult = await $.up(onNavigate)()
          if (navTypeResult === false) return false
        }
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
      bootstrapComplete.then(() => {
        new Router(Array.from(policy.route$s.keys()), catchUp)
          .start().catch(console.error)
      }).catch(e => { throw e })
    }
  }
})

export type MapNavDataOptions = {
  /**
   * Only map the common data object to a page in a nav structure
   * if its route is included in this list.
   *
   * If no list provided, all routes are included.
   */
  includeRoutes?: Array<Route<any>>

  /**
   * Only map the common data object to a page in a nav structure
   * if its route is NOT included in this list.
   *
   * If no list provided, no routes are excluded..
   */
  excludeRoutes?: Array<Route<any>>
}

/**
 * Convenience method to map a common data object to all nodes of a navigation model.
 *
 * This can be a useful and convenient pattern for sharing data across pages
 * with different MetaModels for each page,
 * although it is probably better in most cases for a page to manage its own data in
 * terms such as `onEnter`.
 *
 * Pages can be included or excluded from this behaviour.
 * If both includes and excludes are provided they are cumulative,
 * i.e. a page has to be both in the includes and NOT in the excludes.
 * Normally it makes sense to provide only one or the other.
 *
 * Excluded nodes are initialised according to their own `init` term.
 */
export const mapNavData = <M, N> (
  data: M, navModel: MetaModel<N>, options?: MapNavDataOptions
) => {
  const navData = {} as N
  const keys = modelKeys(navModel)
  for (const key of keys) {
    const childModel = navModel.fields?.[key] as unknown as MetaModel<unknown>
    const include = (
      !options.includeRoutes ||
      options.includeRoutes?.includes(childModel.route)
    ) && !options.excludeRoutes?.includes(childModel.route)
    if (include) {
      const childKeys = modelKeys(childModel)
      // Continue recursing if there are nested-level routes
      const grandChildModels = childKeys.map(ck => childModel.fields[ck]) as Array<MetaModel<unknown>>
      const hasGrandChildRoutes = grandChildModels.some(s => s.route)
      const keyData = hasGrandChildRoutes
        ? mapNavData(data, childModel, options)
        : data
      Object.assign(navData, { [key]: keyData })
    } else {
      Object.assign(navData, { [key]: init(childModel) })
    }
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
  $ = $.$($.state.nav?.selected)
  const isMustHave = typeof mustHave === "function"
  let have$ = $
  if (recurse) {
    while ($?.state.nav?.selected) {
      $ = $.$($.state.nav?.selected)
      if (isMustHave && mustHave($)) {
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
export const setNavSelection: MetaFn<any> = $ => {
  $.state.nav ||= {}
  onDescendants($ => {
    if ($.state.nav?.expandMenu) $.state.nav.expandMenu = false
  })
  $.state.nav.expandMenu = true

  policy.selectedRoute$ = $

  const clearSelection: MetaFn<any> = $ => {
    if ($.state.nav) {
      delete $.state.nav.selected
    }
  }

  onDescendants(clearSelection, true)(root$($))

  // Set any upper selections
  const setParentSelection: MetaFn<any> = $ => {
    const parent$ = $.parent$
    if (parent$) {
      parent$.state.nav = parent$.state.nav || {}
      parent$.state.nav.selected = $.key
      parent$.state.nav.expandMenu = true
      setParentSelection(parent$)
    }
  }

  setParentSelection($)
}

/**
 * Returns a MetaFn that closes the menu for the given navigation item
 * if the screen width is below a specified width.
 *
 * Usually not used directly, but referenced via {@link setNavSelectionResponsive}.
 */
export const closeMenuResponsive = (width: number): MetaFn<any> => $ => {
  if (typeof document === "object" && document.body?.clientWidth < width) {
    const root = root$($)
    root.onDescendants($ => {
      if ($.state.nav?.showMenu) {
        $.state.nav.showMenu = false
      }
    })
  }
}

/**
 * A responsive version of setNavSelection which also closes the menu
 * if the screen size is below a given width.
 *
 * Suitable as an {@link NavigationTerms.onNavigate} term value.
 */
export const setNavSelectionResponsive = (width: number): MetaFn<any> => $ => {
  setNavSelection($)
  closeMenuResponsive(width)($)
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
export const goNavRoute: MetaFn<any> = (item$, event) => {
  while (item$ && !item$.model.route) {
    const firstChildKey = item$.fieldKeys()[0]
    item$ = item$.$(firstChildKey)
  }
  event?.preventDefault()
  event?.stopPropagation()
  item$?.model.route?.go()
}

export const toggleMenu: MetaFn<any> = $ => {
  $.state.nav = $.state.nav || {}
  $.state.nav.showMenu = !$.state.nav.showMenu
}

export const openMenu: MetaFn<any> = $ => {
  $.state.nav = $.state.nav || {}
  $.state.nav.showMenu = true
}

export const closeMenu: MetaFn<any> = $ => {
  $.state.nav = $.state.nav || {}
  $.state.nav.showMenu = false
}

/**
 * Return false if any parent of the given item has state `showMenu === false`.
 * Otherwise return true.
 * Useful for controlling menu items in a "partially" closable (e.g. minimisable) menu.
 */
export const isMenuShown: MetaFn<any> = item$ => {
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
