import { MetaModel } from "metaliq"
import { Package } from "./gen/graphql-types"
import { ModalInfo, modalModel, showMessage, showProgress } from "@metaliq/modals"
import { packageDepndenciesModel, packageInfoModel } from "./package/package-models"
import { intro } from "./gen/content/intro"
import { navigator } from "@metaliq/navigator"
import { route, setNavSelectionResponsive } from "@metaliq/navigation"
import { initApi } from "./gen/graphql-operations"
import { handleResponseErrors } from "@metaliq/integration"

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
  configure: {
    info: Package,
    deps: Package
  }
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
    configure: {
      label: "Configure",
      fields: {
        info: packageInfoModel,
        deps: packageDepndenciesModel
      }
    }
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
  },
  bootstrap: (v, $) => {
    initApi(
      "http://localhost:8940/graphql",
      { onResponse: handleResponseErrors(showMessage, showProgress) }
    )
  },
}
