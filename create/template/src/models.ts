import { MetaModel } from "metaliq"
import { Package } from "./gen/graphql-types"
import { ModalInfo, modalModel } from "@metaliq/modals"
import { packageModel } from "./package/package-model"
import { bootstrapChild } from "@metaliq/application"

export { labelPath } from "@metaliq/terminology"
export { validate } from "@metaliq/validation"
export { op } from "@metaliq/integration"

export const templateUrl = () => import.meta.url

export type App = {
  pkg: Package
  modal: ModalInfo
}

/**
 * MetaliQ runs the meta model called `appModel` by default
 * if you don't specify a model to `metaliq run`.
 */
export const appModel: MetaModel<App> = {
  label: "New MetaliQ Solution",
  fields: {
    pkg: packageModel,
    modal: modalModel
  },
  bootstrap: bootstrapChild("pkg")
}
