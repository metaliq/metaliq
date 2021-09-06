import { match, compile, MatchFunction, PathFunction } from "path-to-regexp"

export type ParamsGetter<T> = ((data: any) => T)
export type RouteGoer<P, Q = any> = (pathParams?: Partial<P>, queryParams?: Partial<Q>) => void
export type RouteHandler<P, Q = any> = (data: any, routeParams: P, queryParams?: Q) => any

/**
 * An object related to a given route pattern, with its associated functions.
 */
export type Route<P extends object, Q extends object = any> = {
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
      const currentPathParams = (this.router.currentRoute || this).match(location.pathname)?.params
      const pathObj = Object.assign(currentPathParams, pathParams)
      const queryObj = Object.assign(searchToObject(location.search), queryParams)

      const query = queryObj ? `?${objectToSearch(queryParams)}` : ""
      const href = (<Route<P, Q>> this).make(pathObj)

      history.pushState(null, null, `${href}${query}`)
      window.dispatchEvent(new PopStateEvent("popstate"))
    },
    match: match(pattern.toString(), { decode: decodeURIComponent }),
    make: compile(pattern.toString())
  }
}

export class Router {

  routes: Array<Route<any>>

  currentRoute?: Route<any>

  data: any

  onPathChange: () => void

  constructor (routes: Array<Route<object>>, data?: any, onHandled?: (...params: any[]) => any) {
    routes.forEach(route => {
      route.router = this
    })

    this.data = data

    this.onPathChange = async () => {
      const path = location.pathname
      for (const route of routes) {
        const urlMatch = route.match(path)
        if (urlMatch) {
          await route.on(this.data, Object.assign(urlMatch.params, searchToObject(location.search)))
          if (onHandled) onHandled()
          this.currentRoute = route
          return
        }
      }
      console.warn(`Unrecognised route: ${path}`)
    }
  }

  start () {
    this.onPathChange()
    window.addEventListener("popstate", this.onPathChange)
    return this // Allow chained `const router = new LitRouter(routes).start()`
  }

  stop () {
    window.removeEventListener("popstate", this.onPathChange)
    return this // For consistency with start()
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
