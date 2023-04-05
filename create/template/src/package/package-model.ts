import { fns, MetaModel } from "metaliq"
import { Dependency, Package } from "../gen/graphql-types"
import { html } from "lit"
import { fetchPackageQuery, initApi, updatePackageMutation } from "../gen/graphql-operations"
import { GraphQLResponseCondition } from "graphqlex"
import { content, field, fields, repeat } from "@metaliq/presentation"
import { button, metaForm } from "@metaliq/forms"
import { showMessage } from "@metaliq/modals"
import { handleResponseErrors, op } from "@metaliq/integration"

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
export const dependencyModel: MetaModel<Dependency> = {
  fields: {
    name: {
      label: "Package Name"
    },
    version: {
      label: "Version"
    }
  }
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
      view: [
        content(html`<h3>Dependencies</h3>`),
        repeat()
      ],
      items: {
        fields: {
          name: {
            label: "Name"
          }
        }
      }
    },
    devDependencies: {
      label: "Development Dependencies"

    },
    peerDependencies: {
      label: "Peer Dependencies"

    }
  },
  view: [
    fields({ exclude: ["dependencies", "devDependencies", "peerDependencies"]}),
    field("dependencies"),
    button({ onClick: op(updatePackageMutation), label: "Save" })
  ],
  bootstrap: async (v, $) => {
    initApi(
      "http://localhost:8940/graphql",
      { onResponse: handleResponseErrors(showMessage) }
    )
    $.op(fetchPackageQuery)()
    // const response = await fetchPackageQuery({})
    // for (const gqlError of response.graphQLErrors) {
    //   $.child$(gqlError.path[1] as any).state.error = gqlError.message
    // }
    // $.value = response.data
  }
}
