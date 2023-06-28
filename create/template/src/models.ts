import { MetaModel } from "metaliq"
import { Package } from "./gen/graphql-types"
import { ModalInfo, modalModel } from "@metaliq/modals"
import { packageModel } from "./package/package-model"
import { intro } from "./gen/content/intro"
import { navigator } from "@metaliq/navigator"
import { route, setNavSelectionResponsive } from "@metaliq/navigation"

export { labelPath } from "@metaliq/terminology"
export { validate } from "@metaliq/validation"
export { op } from "@metaliq/integration"

export const templateUrl = () => import.meta.url

export type App = {
  nav: Nav
  modal: ModalInfo
}

export type Nav = {
  welcome: any
  package: Package
}

const navModel: MetaModel<Nav> = {
  view: navigator({
    logoUrl: "res/metaliq-logo-dark.png"
  }),
  onNavigate: setNavSelectionResponsive(800),
  fields: {
    welcome: {
      label: "Welcome",
      view: intro,
      route: route("/")
    },
    package: packageModel
  }
}

/**
 * MetaliQ runs the meta model called `appModel` by default
 * if you don't specify a model to `metaliq run`.
 */
export const appModel: MetaModel<App> = {
  label: "New MetaliQ Solution",
  fields: {
    nav: navModel,
    modal: modalModel
  }
}
