import { compile, match, MatchFunction, PathFunction } from "path-to-regexp"
import { EndoFunction, objectTransformer } from "../../util/util"

export type RouteGoer<P, Q = any> = (pathParams?: Partial<P>, queryParams?: Partial<Q>) => void
/**
 * RouteHandler is a function with parameters typed to the route path and search query.
 * It can be synchronous or asynchronous.
 * In either case, if it returns boolean literal `false` navigation is cancelled.
 */
export type RouteHandler<P, Q = any> = (routeParams: P, queryParams?: Q) => any

/**
 * An route related to a given pattern, which has the embedded URL parameters P,
 * and potentially also takes optional query terms Q.
 * Routes maintain association with their handler (the `on` function)
 * and provide various functions including `go`, which navigates to the route
 * with the given URL parameters and query terms.
 */
export type Route<P extends object, Q = any> = {
  pattern: string
  onEnter?: RouteHandler<P, Q> // Performed on entering the route
  onLeave?: RouteHandler<P, Q> // Performed on leaving the route, return false to cancel
  match: MatchFunction<P> // Matcher for the route's given pattern
  make: PathFunction<P> // Function to construct a route of the given pattern
  go: RouteGoer<P, Q> // Function to go to the given route
  router?: Router
}

/**
 * Create a route for the given pattern.
 */
export function route<P extends object, Q extends object = any> (pattern: string): Route<P, Q> {
  return {
    pattern,
    async go (pathParams?, queryParams?) {
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

  static disabled = false

  routes: Array<Route<any>>

  currentRoute?: Route<any>

  onHandled: (...params: any[]) => any

  constructor (routes: Array<Route<object>>, onHandled?: (...params: any[]) => any) {
    (this.routes = routes).forEach(route => {
      route.router = this
    })
    this.onHandled = onHandled
  }

  oldLocation: { pathParams: any, query: any } = null

  async canLeave () {
    if (typeof this.currentRoute?.onLeave === "function") {
      const leave = await this.currentRoute.onLeave(
        this.oldLocation?.pathParams || {},
        this.oldLocation?.query || {}
      )
      return leave
    }
  }

  async onPathChange () {
    for (const route of this.routes) {
      const urlMatch = route.match(location.pathname)
      if (urlMatch) {
        if (!Router.disabled) {
          const pathParams = urlMatch.params
          const query = queryToObject()
          if (typeof route.onEnter === "function") {
            const enter = await route.onEnter(pathParams, query)
            if (enter === false) return
          }
          if (this.onHandled) await this.onHandled()
          this.oldLocation = { pathParams, query }
        }
        this.currentRoute = route
        return
      }
    }
    console.warn(`Unrecognised route: ${location.pathname}`)
  }

  // Proxy the async path change method to a valid (sync) event handler
  handler = () => {
    this.onPathChange().catch(e => { throw e })
  }

  async start () {
    window.addEventListener("popstate", this.handler)
    await this.onPathChange()
    return this // Enable `router = await new Router().start()`
  }

  stop () {
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
