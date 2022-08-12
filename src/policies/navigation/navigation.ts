import { Route, RouteHandler, Router } from "./router"
import { $nf, $Fn, FieldKey, fieldKeys, getAncestorSpecValue, Meta, metaSetups, MetaSpec, reset, IsMeta } from "../../meta"
import { MaybeReturn } from "../../util/util"
import { up } from "@metaliq/up"
import { extendBootstrap } from "../application/application"

export { route } from "./router"

export interface NavigationSpec<T, P = any, RP extends object = any, RQ = any> {
  /**
   * Route object associated with this specification.
   */
  route?: Route<RP, RQ>

  /**
   * Meta functions for application navigation events.
   */
  onEnter?: $Fn<T, P, RouteHandler<RP, RQ>>
  onLeave?: $Fn<T, P, RouteHandler<RP, RQ>>

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
  onNavigate?: (to: IsMeta<any>) => MaybeReturn<boolean>
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

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends NavigationSpec<T, P> {}

    interface State<T, P> {
      this?: State<T, P>
      nav?: NavigationState<T>
    }
  }
}

type NavigationPolicy = {
  routeMetas: Map<Route<object>, IsMeta<any>>
  selectedRouteMeta: Meta<any>
}
const policy: NavigationPolicy = {
  routeMetas: new Map(),
  selectedRouteMeta: null
}

export const routeMeta = (route: Route<object>) => policy.routeMetas.get(route)

metaSetups.push(meta => {
  const spec = meta.$.spec
  // If this spec has a route, initialise any route handling functions
  if (spec?.route) {
    policy.routeMetas.set(spec.route, meta)
    if (typeof spec.onLeave === "function") {
      spec.route.onLeave = $nf(spec.onLeave)(meta)
    }
    spec.route.onEnter = (params) => {
      up(async () => {
        let routeResult
        if (typeof spec.onEnter === "function") {
          routeResult = await $nf(spec.onEnter)(meta)(params)
          if (routeResult === false) return false
        }
        const navType = getAncestorSpecValue(meta, "navType")
        if (typeof navType?.onNavigate === "function") {
          const navTypeResult = navType.onNavigate(meta)
          if (navTypeResult === false) return false
        }
        return routeResult
      })()
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
      extendBootstrap(meta, (v, m) => {
        // Extend any existing bootstrap to initialise the Router
        const router = new Router(
          Array.from(policy.routeMetas.keys()),
          () => {
            // Reset the backlinks for the currently selected value
            policy.selectedRouteMeta && reset(policy.selectedRouteMeta)
          }
        ).start()
        router.catch(console.error)
      })
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
export const getNavSelection = <T>(navMeta: Meta<T>) => {
  const key: FieldKey<T> = navMeta.$.state.nav?.selected
  return navMeta[key] as Meta<any>
}

/**
 * Set the navigation meta state.
 */
export const setNavSelection = (selectedMeta: Meta<any>, recursing = false) => {
  const parent = selectedMeta.$.parent
  if (!recursing) policy.selectedRouteMeta = selectedMeta
  if (parent) {
    parent.$.state.nav = parent.$.state.nav || {}
    parent.$.state.nav.selected = selectedMeta.$.key
    if (parent.$.state.nav.showMenu) {
      parent.$.state.nav.showMenu = false
    }
    setNavSelection(parent, true)
  }
}

/**
 * Go to the given nav node's route if it has one,
 * otherwise find and go to its first child route.
 * This will in turn trigger any onNavigation, such as `selectMenuItem`.
 */
export const goNavRoute = (item: Meta<any>) => {
  while (item && !item.$.spec.route) {
    const firstChildKey = fieldKeys(item.$.spec)[0]
    item = item[firstChildKey] as Meta<any>
  }
  item.$.spec.route?.go()
}

export const freeNavigation: NavigationType = {
  onNavigate: setNavSelection
}

export const toggleMenu = (m: Meta<any>) => {
  m.$.state.nav = m.$.state.nav || {}
  m.$.state.nav.showMenu = !m.$.state.nav.showMenu
}

export const openMenu = (m: Meta<any>) => {
  m.$.state.nav = m.$.state.nav || {}
  m.$.state.nav.showMenu = true
}

export const closeMenu = (m: Meta<any>) => {
  m.$.state.nav = m.$.state.nav || {}
  m.$.state.nav.showMenu = false
}
