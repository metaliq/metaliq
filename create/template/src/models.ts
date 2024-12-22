import { MetaModel } from "metaliq"
import { Package } from "./gen/graphql-types"
import { ModalInfo, modalModel, showMessage, showProgress } from "@metaliq/modals"
import { packageDependenciesModel, packageInfoModel } from "./package/package-models"
import { intro } from "./gen/content/intro"
import { navigator } from "@metaliq/navigator"
import { redirect, route, setNavSelectionResponsive } from "@metaliq/navigation"
import { initApi } from "./gen/graphql-operations"
import { handleResponseErrors } from "@metaliq/integration"
import { webPageApp } from "@metaliq/web-page-app"

/**
 * Register the terminology policy to enable access to its terms
 */
export { TERMINOLOGY } from "@metaliq/terminology"

/**
 * A top-level data type for the front-end application
 */
export type App = {
  nav: Nav
  modal: ModalInfo
}

/**
 * A data type for the app's navigation structure
 */
export type Nav = {
  welcome: any
  configure: {
    info: Package
    deps: Package
  }
  fallback: any
}

/**
 * The route to use for the home page.
 */
export const homeRoute = route("/")

/**
 * A catch-all for redirecting unknown routes.
 * Specifying it directly like this rather than in the navigation policy
 * allows for solutions to define significant portions of the route
 * (such as initial path elements within a multi-tenant hosted solution)
 * that should be preserved and passed back to the default.
 */
export const fallbackRoute = route("/:a?/:b?/:c?/:d?/:e?/:f?/:g?")

/**
 * A MetaModel for the Nav type that defines the app's navigation structure.
 */
const navModel: MetaModel<Nav> = {
  view: navigator({
    logoUrl: "res/metaliq-logo-dark.png"
  }),
  onNavigate: setNavSelectionResponsive(940),
  fields: {
    welcome: {
      label: "Welcome",
      view: intro,
      route: homeRoute
    },
    configure: {
      label: "Configure",
      fields: {
        info: packageInfoModel,
        deps: packageDependenciesModel
      }
    },
    fallback: {
      route: fallbackRoute,
      onEnter: () => redirect(homeRoute)
    }
  }
}

/**
 * MetaliQ runs the MetaModel called `appModel` by default
 * if you don't specify a model to `metaliq run`.
 *
 * This is a typical top-level app MetaModel that combines the navigation structure
 * with the modal display capability provided by MetaliQ.
 */
export const appModel: MetaModel<App> = {
  label: "New MetaliQ Solution",
  fields: {
    nav: navModel,
    modal: modalModel
  },
  init: () => initApi("http://localhost:8940/graphql", {
    // Link the initialised API to a response handler that displays progress and errors
    onResponse: handleResponseErrors(showMessage, showProgress)
  }) && null,
  publicationTarget: webPageApp({
    build: {
      copy: ["node_modules/bootstrap-icons/font/fonts"]
    }
  })
}
