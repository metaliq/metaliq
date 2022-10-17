/**
 * @metaliq/create-solution is the base starter template for
 * initialising a new MetaliQ solution.
 * This script is the main entry point.
 *
 * Normally this is initiated with the command:
 *
 * ```sh
 * pnpm init @metaliq/solution
 * ```
 *
 * It initialises a MetaliQ solution consisting of:
 *
 * * Standard project environment
 *   * Toolchain config and core package dependencies
 *   * Dev, test and build scripts
 * * Sample single-page-application
 *   * Present MQ intro, online doc links and KH contact info
 *   * Interactive project setup document
 *   * Configurable name, description, author, license etc.
 *   * Selectable list of MetaliQ organisation packages
 * * Sample GraphQL API
 *   * Query available MetaliQ org packages
 *   * Queries and mutations for package.json maintenance
 *
 * Once initialised, the project is automatically run.
 * It can be re-launched again at any time with the command:
 *
 * ```
 * metaliq run
 * ```
 *
 * This starts the sample full-stack web application running locally,
 * and opens its front end in the default browser.
 * The app provides a guided pathway to the next stage
 * of solution implementation, including documentation links
 * and an interactive project configuration wizard.
 *
 * The application showcases the technical aspects of various
 * MetaliQ policies typically used in the delivery of a
 * digital business solution, as well as providing background
 * on K-Factor approaches.
 *
 * The implementation is found within the project's
 * source code directory, and serves as a starting point
 * from which to evolve new solutions.
 */

import { URL } from "url"
import { cp } from "fs/promises"
import { cwd } from "process"
import { resolve } from "path"
import { templateUrl } from "@metaliq/template"

const main = async () => {
  console.log("Creating MetaliQ solution")

  const templateDir = resolve(new URL(".", templateUrl()).pathname, "..") + "/"
  const excludeDirs = ["bin", "node_modules", ".idea"]

  await cp(templateDir, cwd(), {
    filter (source: string, destination: string): boolean {
      for (const dir of excludeDirs) {
        if (source.match(new RegExp(`/@metaliq/template/${dir}`))) return false
      }
      return true
    },
    recursive: true
  })
}

main().catch(console.error)
