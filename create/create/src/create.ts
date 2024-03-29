/**
 * @metaliq/create is the base starter template for
 * initialising a new MetaliQ solution.
 * This script is the main entry point.
 *
 * Normally this is run in a new, empty directory with the command:
 *
 * ```sh
 * pnpm create @metaliq
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
 * pnpm start
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
import { cp, readFile, writeFile, readdir, mkdir, rename } from "fs/promises"
import { cwd, chdir } from "process"
import { resolve } from "path"
import { templateUrl } from "@metaliq/template/bin/templateUrl.js"
import { execaCommand } from "execa"

const exec = (command: string) => execaCommand(command, { stdio: "inherit" })

const main = async () => {
  console.log(`process.argv: ${process.argv.join(" ")}`)

  const projectPath = process.argv.pop()
  if (projectPath && !projectPath.match(/create\.js$/)) {
    try {
      await mkdir(projectPath)
    } catch (e) {
      console.log(`Directory ${projectPath} may already exist, continuing to use it if present and empty`)
    }
    chdir(projectPath)
  }

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
  const exclude = ["bin", "node_modules", ".idea", "tsconfig.tsbuildinfo"]
  await cp(templateDir, projectDir, {
    filter (source: string, destination: string): boolean {
      for (const dir of exclude) {
        if (source.match(new RegExp(`${templateDir}${dir}`))) return false
      }
      return true
    },
    recursive: true
  })

  // These files get excluded under their standard names
  // See: https://docs.npmjs.com/cli/v9/using-npm/developers
  await rename(resolve(projectDir, ".gitignore.template"), resolve(".gitignore"))
  await rename(resolve(projectDir, "_npmrc"), resolve(".npmrc"))

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
  if (pkg.dependencies.metaliq !== "workspace:*") { // Only install the prepared and published template
    await exec("pnpm install --prefer-offline")
    await exec("pnpm start")
  }
}

main().catch(console.error)
