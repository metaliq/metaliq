import { MetaModel } from "metaliq"
import { repeat } from "@metaliq/presentation"
import { metaForm } from "@metaliq/forms"
import { Dependency, Package } from "./gen/graphql-types"
import { fetchPackageQuery, initApi } from "./gen/graphql-operations"
import { html } from "lit"
import { GraphQLResponseCondition } from "graphqlex"
import { ModalInfo, modalModel, showMessage } from "@metaliq/modals"
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
