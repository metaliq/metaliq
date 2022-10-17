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
import { cp, readFile, writeFile, readdir } from "fs/promises"
import { cwd } from "process"
import { resolve } from "path"
import { templateUrl } from "@metaliq/template"
import { exec } from "child_process"
import { promisify } from "util"

const pExec = promisify(exec)

const main = async () => {

  const projectDir = cwd()
  const projectName = projectDir.split(/[\\/]/).filter(Boolean).pop()
  const existing = await readdir(projectDir)
  if (existing.length) {
    console.error(`${projectDir} is not empty. Please change to an empty directory to create a new MetaliQ solution.`)
    return
  } else {
    console.log(`Creating MetaliQ solution ${projectName}`)
  }

  // Copy template files to new project
  const templateDir = resolve(new URL(".", templateUrl()).pathname, "..") + "/"
  const excludeDirs = ["bin", "node_modules", ".idea"]
  await cp(templateDir, projectDir, {
    filter (source: string, destination: string): boolean {
      for (const dir of excludeDirs) {
        if (source.match(new RegExp(`${templateDir}${dir}`))) return false
      }
      return true
    },
    recursive: true
  })

  // Remove project extension from tsconfig
  const tsConfigPath = resolve(projectDir, "tsconfig.json")
  const tsConfigJson = await readFile(tsConfigPath, "utf8")
  const tsConfig = JSON.parse(tsConfigJson)
  delete tsConfig.extends
  await writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2))

  // Package.json updates
  const packagePath = resolve(projectDir, "package.json")
  const packageJson = await readFile(packagePath, "utf8")
  const pkg = JSON.parse(packageJson)
  pkg.name = projectName
  pkg.author = ""
  pkg.description = ""
  pkg.licesnse = ""
  pkg.version = "0.1.0"
  await writeFile(packagePath, JSON.stringify(pkg, null, 2))

  // Install and run
  await pExec("pnpm install --prefer-offline")
  await pExec("pnpm start")

}

main().catch(console.error)
