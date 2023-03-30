import { MetaModel } from "metaliq"
import { repeat } from "@metaliq/presentation"
import { content, metaForm } from "@metaliq/forms"
import { Dependency, Package } from "./gen/graphql-types"
import { fetchPackageQuery, setApi, setApiUrl } from "./gen/graphql-operations"
import { html } from "lit"

export { labelPath } from "@metaliq/terminology"
export { validate } from "@metaliq/validation"

export const templateUrl = () => import.meta.url

/**
 * This is a validator for semantic versions, showing how a validator function is made.
 * It takes a proposed value, checks it (in this case against a regex)
 * and returns either `true` (indicating that the value is valid) or an error message.
 */
export const versionValidator = (version: string) =>
  !!version.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/) ||
  "This needs to be a valid semantic version"

/**
 * A meta model for the data type Dependency.
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
 * MetaliQ runs the meta model called `appModel` by default
 * if you don't specify a model to `metaliq run`.
 */
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
  view: metaForm(),
  bootstrap: async (v, $) => {
    setApiUrl("http://localhost:8940/graphql")
    const response = await fetchPackageQuery({})
    for (const gqlError of response.graphQLErrors) {
      $.child$(gqlError.path[1] as any).state.error = gqlError.message
    }
    $.value = response.data
  }
}
