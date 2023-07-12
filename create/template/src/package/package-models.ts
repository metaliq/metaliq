import { MetaModel } from "metaliq"
import { Dependency, Package } from "../gen/graphql-types"
import { html } from "lit"
import { fetchPackageQuery, initApi, updatePackageMutation } from "../gen/graphql-operations"
import { content, fields, repeat, tag, tags } from "@metaliq/presentation"
import { button } from "@metaliq/forms"
import { showMessage, showProgress } from "@metaliq/modals"
import { handleResponseErrors, op } from "@metaliq/integration"
import { route } from "@metaliq/navigation"

export { APPLICATION } from "@metaliq/application"
export { NAVIGATION } from "@metaliq/navigation"

/**
 * This is a validator for semantic versions, showing how a validator function is made.
 * It takes a proposed value, checks it (in this case against a regex)
 * and returns either `true` (indicating that the value is valid) or an error message.
 */
const versionValidator = (version: string) =>
  !!version.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/) ||
  "This needs to be a valid semantic version"

/**
 * Set up a tag configured with classes that apply the same styling used by the metadocs.
 */
const page = tag(".md-page.markdown-body")

/**
 * A MetaModel for the data type Dependency.
 */
export const dependenciesModel: MetaModel<Dependency[]> = {
  items: {
    fields: {
      name: {
        label: "Package Name"
      },
      version: {
        label: "Version"
      }
    }
  },
  view: [
    tag("h2")((v, $) => $.term("label")),
    tag(".deps-grid-cols .deps-grid-header")(
      tags()(["Package Name", "Version"])
    ),
    tag(".deps-grid")(
      repeat(tag(".deps-grid-cols")(fields()))
    )
  ],
  hidden: v => !v // Hide until populated
}

const savePackageButton = tag(".form-controls")(
  button({
    type: "success",
    onClick: op(updatePackageMutation, { message: "Updating package" }),
    label: "Save"
  })
)

/**
 * A MetaModel for the data type Package.
 */
export const packageInfoModel: MetaModel<Package> = {
  label: "Information",
  route: route("/config/info"),
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
      validator: versionValidator
    }
  },
  view: page([
    tag("h1")("Configure Solution Information"),
    fields(),
    savePackageButton,
  ]),
  onEnter: () => op(
    fetchPackageQuery,
    { message: "Fetching project information" }
  )
}

export const packageDependenciesModel: MetaModel<Package> = {
  label: "Dependencies",
  route: route("/config/deps"),
  fields: {
    dependencies: {
      ...dependenciesModel,
      label: "Dependencies"
    },
    devDependencies: {
      ...dependenciesModel,
      label: "Development Dependencies"
    }
  },
  view: page([
    tag("h1")("Configure Project Dependencies"),
    fields(),
    savePackageButton
  ]),
  onEnter: () => op(
    fetchPackageQuery,
    { message: "Fetching project information" }
  )
}
