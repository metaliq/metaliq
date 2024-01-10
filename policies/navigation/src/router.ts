import { compile, match, MatchFunction, PathFunction } from "path-to-regexp"
import { EndoFunction, objectTransformer } from "@metaliq/util"

/**
 * Signature of a route's `go` method.
 * Can specify the path parameters <P> and query parameters <Q>.
 */
export type RouteGoer<P, Q = any> = (pathParams?: Partial<P>, queryParams?: Partial<Q>) => any

/**
 * A route parameters object supplied to any route handlers.
 * Contains any selection of the properties of the route's
 * path paramaters <P> and query parameters <Q>.
 */
export type RouteParams<P, Q = any> = Partial<P & Q>

/**
 * The signature of a route handler function (such as onEnter and onLeave).
 */
export type RouteHandler<P, Q = any> = (params?: RouteParams<P, Q>) => any

/**
 * A route related to a given pattern, which has the embedded URL parameters P,
 * and potentially also takes optional query terms Q.
 * Routes maintain association with their handlers (`onEnter` and `onLeave`)
 * and provide various functions including `go`, which navigates to the route
 * with the given URL parameters and query terms.
 */
export type Route<P extends object, Q = any> = {
  /**
   * The route pattern to match, including parameters, using the `path-to-regexp` format.
   */
  pattern: string

  /**
   * Use this route as a fallback in the case of unrecognised URL paths.
   * Typically would be the `home` route with pattern `\` but could be assigned differently.
   * In the case where this is true for multiple routes, the first one in the
   * order of the collection of routes provided to the Router will be the fallback.
   */
  isFallback?: boolean

  /**
   * A hook for functionality performed on entering the route.
   * If this returns false, the route is not entered.
   */
  onEnter?: RouteHandler<P, Q> // Performed on entering the route

  /**
   * A hook for functionality to be performed on leaving the route.
   * If this returns false, the route will not be changed.
   */
  onLeave?: RouteHandler<P, Q> // Performed on leaving the route, return false to cancel

  /**
   * The matching function created when the route is initialised.
   */
  match: MatchFunction<P> // Matcher for the route's given pattern

  /**
   * The maker function created when the route is initialised.
   */
  make: PathFunction<P> // Function to construct a route of the given pattern

  /**
   * Navigate to the given route, with the provided route parameters.
   */
  go: RouteGoer<P, Q> // Function to go to the given route

  /**
   * The router that contains this route.
   */
  router?: Router
}

/**
 * Create a route for the given pattern.
 */
export function route<P extends object, Q extends object = any> (pattern: string): Route<P, Q> {
  return {
    pattern,
    async go (pathParams?, queryParams?) {
      if (!this.router.enabled) return
      const leave = await this.router.canLeave()
      if (leave === false) {
        if (this.router.onHandled) this.router.onHandled()
        return
      }
      const preservePathParams = this.router.currentRoute?.match(location.pathname)?.params
      const pathObj = deSlashObject(Object.assign({}, preservePathParams, pathParams))
      const path = (<Route<P, Q>> this).make(pathObj)
      const queryObj = deSlashObject(Object.assign(queryToObject(), queryParams))
      const hasQuery = !!Object.keys(queryObj).length
      const query = hasQuery ? `?${objectToQuery(queryParams)}` : ""

      history.pushState(null, null, `${path}${query}`)
      window.dispatchEvent(new PopStateEvent("popstate"))
    },
    match: match(pattern.toString(), { decode: decodeURIComponent }),
    make: compile(pattern.toString())
  }
}

export class Router {

  enabled = false

  routes: Array<Route<any>>

  currentRoute?: Route<any>

  onHandled: (...params: any[]) => any

  constructor (
    routes: Array<Route<object>>,
    onHandled?: (...params: any[]) => any
  ) {
    (this.routes = routes).forEach(route => {
      route.router = this
    })
    this.onHandled = onHandled
  }

  oldLocation: { pathParams: any, queryParams: any } = null

  /**
   * Test whether the current route can be left.
   */
  async canLeave () {
    if (typeof this.currentRoute?.onLeave === "function") {
      const leave = await this.currentRoute.onLeave({
        ...this.oldLocation?.pathParams,
        ...this.oldLocation?.queryParams
      })
      return leave
    }
  }

  async onPathChange () {
    for (const route of this.routes) {
      if (route.router.enabled || true) {
        const urlMatch = route.match(location.pathname)
        if (urlMatch) {
          const pathParams = urlMatch.params
          const queryParams = queryToObject()
          if (typeof route.onEnter === "function") {
            const enter = await route.onEnter({
              ...pathParams, ...queryParams
            })
            if (enter === false) return
          }
          if (this.onHandled) await this.onHandled()
          this.oldLocation = { pathParams, queryParams }
          this.currentRoute = route
          return
        }
      }
    }
    console.warn(`Unrecognised route: ${location.pathname}`)
  }

  // Proxy the async path change method to a valid (sync) event handler
  handler = () => {
    this.onPathChange().catch(e => { throw e })
  }

  async start () {
    this.enabled = true
    window.addEventListener("popstate", this.handler)
    await this.onPathChange()
    return this // Enable `router = await new Router().start()`
  }

  stop () {
    this.enabled = false
    window.removeEventListener("popstate", this.handler)
    return this // Consistent with start()
  }
}

/**
 * URL query parameters are best dealt with separately from route patterns, as they should be valid in any order.
 * Instead, get them (within route `on` handling) and set them with these functions.
 */
export function getQueryParam (name: string) {
  return new URLSearchParams(location.search).get(name)
}

function objectToQuery (params?: object) {
  const urlParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    urlParams.set(key, value)
  }
  return urlParams.toString()
}

function queryToObject (search?: string) {
  search = search || location.search
  const urlSearchParams = new URLSearchParams(search)
  const result: any = {}
  for (const [key, value] of urlSearchParams.entries()) {
    result[key] = value
  }
  return result
}

export const deSlash = (str: string) => str.replace(/\//g, "%2F")

export const deSlashObject = objectTransformer(([k, v]) => [
  k, typeof v === "string" ? deSlash(v) : v
]) as EndoFunction
