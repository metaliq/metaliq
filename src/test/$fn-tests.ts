import { describe, it } from "mocha"
import chai from "chai"
import { $Fn, $fn } from "../meta"
import { Contact } from "./test-types"
import { organisationSpec } from "./test-specs"
import { run } from "../policies/application/application"

chai.should()

/**
 * One of the core types in Metaliq is `$Fn`,
 * which represents a "meta-function" (a.k.a. "dollar-function").
 *
 * Meta-functions are a pattern used widely in MetaliQ
 * to represent business rules, processes and views.
 * Many policy terms are specified as meta-functions,
 * and the `up` state update mechanism is configured to work with them.
 *
 * They accept the meta info (the `$` property) of a meta object,
 * along with optional additional data and event parameters.
 */
describe("Meta-functions", () => {

  /**
   * There are various different ways to create meta-functions,
   * as well as to access parts of the provided meta-info object.
   */
  describe("Creating meta functions", () => {
    /**
     * While you can declare meta functions with typed access to all meta info
     * (as will be shown below),
     * it is common to express business rules and logic
     * with plain, framework-agnostic functions on the underlying data
     * and then use `$fn` to convert these plain functions
     * to appropriately typed metafunctions when using them with MetaliQ.
     */
    it("Framework-agnostic business logic", async () => {
      // A plain business rule function with no tech "K"
      const fullName = (contact: Contact) => `${contact.firstName} ${contact.lastName}`

      // Make a $Fn that can be used by policy terms, `up` etc.
      const $fullName: $Fn<Contact> = $fn(fullName)

      const mOrg = await run(organisationSpec)
      const mPrincipal = mOrg.principal
      const fullNameResult = $fullName(mPrincipal.$)
      fullNameResult.should.be.a("string").with.valueOf("Dexter Sachell")
    })

    /**
     * The meta info object (`$`) is the first (and sometimes only) parameter to a $Fn.
     */
    it("Access the meta info via the $ parameter", async () => {
      const fullName: $Fn<Contact> = $ => `${$.value.firstName} ${$.value.lastName}`

      const mOrg = await run(organisationSpec)
      const mPrincipal = mOrg.principal
      const fullNameResult = fullName(mPrincipal.$)
      fullNameResult.should.be.a("string").with.valueOf("Dexter Sachell")
    })

    /**
     * You can extract individual meta info keys (such as `value`)
     * using destructuring assigment.
     */
    it("Destructuring the meta info", async () => {
      const fullName: $Fn<Contact> = ({ value }) => `${value.firstName} ${value.lastName}`

      const mOrg = await run(organisationSpec)
      const mPrincipal = mOrg.principal
      const fullNameResult = fullName(mPrincipal.$)
      fullNameResult.should.be.a("string").with.valueOf("Dexter Sachell")
    })

    /**
     * You can rename extracted meta info keys.
     */
    it("Aliased destructuring", async () => {
      const fullName: $Fn<Contact> = ({ value: contact }) => `${contact.firstName} ${contact.lastName}`

      const mOrg = await run(organisationSpec)
      const mPrincipal = mOrg.principal
      const fullNameResult = fullName(mPrincipal.$)
      fullNameResult.should.be.a("string").with.valueOf("Dexter Sachell")
    })
  })
})
