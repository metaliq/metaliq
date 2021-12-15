import { match, compile, MatchFunction, PathFunction } from "path-to-regexp"

export type ParamsGetter<T> = ((data: any) => T)
export type RouteGoer<P, Q = any> = (pathParams?: Partial<P>, queryParams?: Partial<Q>) => void
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
  on?: RouteHandler<P, Q> // Optionally initialised on creation or added later
  match: MatchFunction<P> // Matcher for the route's given pattern
  make: PathFunction<P> // Function to construct a route of the given pattern
  go: RouteGoer<P, Q> // Function to go to the given route
  router?: Router
  data?: any // A data object stored with the route that is passed into the parameter getter on `go`
}

/**
 * Create a route for the given pattern, optionally with a given route handler.
 */
export function route<P extends object, Q extends object = any> (pattern: string, on?: RouteHandler<P>): Route<P, Q> {
  return {
    pattern,
    on,
    go: function (pathParams?, queryParams?) {
      // TODO: Allow pathParams and queryParams to be a getter with this.data
      const currentPathParams = (this.router.currentRoute || this).match(location.pathname)?.params
      const pathObj = Object.assign(currentPathParams, pathParams)
      const path = (<Route<P, Q>> this).make(pathObj)
      const queryObj = Object.assign(searchToObject(location.search), queryParams)
      const hasQuery = !!Object.keys(queryObj).length
      const query = hasQuery ? `?${objectToSearch(queryParams)}` : ""

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

  async onPathChange () {
    const path = location.pathname
    for (const route of this.routes) {
      const urlMatch = route.match(path)
      if (urlMatch) {
        this.currentRoute = route
        if (!Router.disabled) {
          await route.on(urlMatch.params, searchToObject(location.search))
          if (this.onHandled) this.onHandled()
        }
        return
      }
    }
    console.warn(`Unrecognised route: ${path}`)
  }

  // Proxy the async path change method to a valid event handler

  handler = () => {
    this.onPathChange().catch(e => { throw e })
  }

  async start () {
    window.addEventListener("popstate", this.handler)
    await this.onPathChange()
    return this // Enable router = await new Router().start()
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

function objectToSearch (params?: object) {
  const urlParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    urlParams.set(key, value)
  }
  return urlParams.toString()
}

function searchToObject (search: string) {
  const urlSearchParams = new URLSearchParams(search)
  const result: any = {}
  for (const [key, value] of urlSearchParams.entries()) {
    result[key] = value
  }
  return result
}
