import { MetaModel } from "metaliq"
import { Dependency, Package } from "../gen/graphql-types"
import { html } from "lit"
import { fetchPackageQuery, initApi, updatePackageMutation } from "../gen/graphql-operations"
import { content, fields, repeat, tag } from "@metaliq/presentation"
import { button } from "@metaliq/forms"
import { showMessage, showProgress } from "@metaliq/modals"
import { handleResponseErrors, op } from "@metaliq/integration"

export { APPLICATION } from "@metaliq/application"

/**
 * This is a validator for semantic versions, showing how a validator function is made.
 * It takes a proposed value, checks it (in this case against a regex)
 * and returns either `true` (indicating that the value is valid) or an error message.
 */
export const versionValidator = (version: string) =>
  !!version.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/) ||
  "This needs to be a valid semantic version"

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
    content(html`<h3>Dependencies</h3>`),
    repeat(tag(".deps-grid", fields()))
  ]
}

/**
 * A MetaModel for the data type Package.
 */
export const packageModel: MetaModel<Package> = {
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
    },
    dependencies: {
      label: "Dependencies",
      ...dependenciesModel
    },
    devDependencies: {
      label: "Development Dependencies",
      ...dependenciesModel
    },
    peerDependencies: {
      label: "Peer Dependencies",
      ...dependenciesModel
    }
  },
  view: [
    content(html`<h1>Project Configuration</h1>`),
    fields({ exclude: ["devDependencies", "peerDependencies"] }),
    button({ onClick: op(updatePackageMutation, null, { message: "Updating package" }), label: "Save" })
  ],
  bootstrap: (v, $) => {
    initApi(
      "http://localhost:8940/graphql",
      { onResponse: handleResponseErrors(showMessage, showProgress) }
    )
    $.op(fetchPackageQuery, null, { message: "Fetching project information" })()
  }
}
