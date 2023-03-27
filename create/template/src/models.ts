import { MetaModel } from "metaliq"
import { metaForm } from "@metaliq/forms"
import { Package } from "./gen/graphql-types"

export { labelPath } from "@metaliq/terminology"
export { validate } from "@metaliq/validation"

export const templateUrl = () => import.meta.url

export const appModel: MetaModel<Package> = {
  label: "New MetaliQ Solution",
  fields: {
    name: {
      label: "Name"
    },
    author: {
      label: "Author"
    },
    license: {
      label: "License"
    },
    description: {
      label: "Description"
    },
    version: {
      label: "Version",
      validator: version =>
        !!version.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/) ||
        "This needs to be a valid semantic version"
    }
  },
  view: metaForm()
}
