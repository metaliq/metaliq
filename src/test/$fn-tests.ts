import chai from "chai"
import { describe } from "mocha"
import { $Fn, $fn } from "../meta"
import { Contact } from "./test-types"
import { organisationSpec } from "./test-specs"
import { run } from "../policies/application"

chai.should()

/**
 * Metafunctions are a pattern used widely in MetaliQ
 * to represent business rules, processes and views.
 *
 * For example many policy terms are specified as metafunctions,
 * and the meta local `up` function is configured to work with them.
 *
 * They accept the meta info (the `$` property) of a meta object,
 * along with optional data and event parameters for additional info.
 *

 */
describe("Meta functions ($Fn)", () => {

  /**
   * The meta info object (`$`) is the first (and sometimes only) parameter to a $Fn.
   */
  it("Access the meta info via the $ parameter", async () => {
    const fullName: $Fn<Contact> = $ => $.value.firstName + " " + $.value.lastName

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
    const fullName: $Fn<Contact> = ({ value }) => value.firstName + " " + value.lastName

    const mOrg = await run(organisationSpec)
    const mPrincipal = mOrg.principal
    const fullNameResult = fullName(mPrincipal.$)
    fullNameResult.should.be.a("string").with.valueOf("Dexter Sachell")
  })

  /**
   * You can rename extracted meta info keys.
   */
  it("Aliased destructuring", async () => {
    const fullName: $Fn<Contact> = ({ value: contact }) => contact.firstName + " " + contact.lastName

    const mOrg = await run(organisationSpec)
    const mPrincipal = mOrg.principal
    const fullNameResult = fullName(mPrincipal.$)
    fullNameResult.should.be.a("string").with.valueOf("Dexter Sachell")
  })

  /**
   * While you can declare dollar functions with typed access to all meta info,
   * but it is also common to express business rules and logic
   * with framework-agnostic functions on the underlying data
   * and use `$fn` to convert these to appropriately typed
   * metafunctions where needed.
   */
  it("Framework-agnostic business logic", async () => {
    // Business logic with no tech "K"
    const fullName = (contact: Contact) => contact.firstName + " " + contact.lastName

    // Make a $Fn that can be used by policy terms, `up` etc.
    const $fullName: $Fn<Contact> = $fn(fullName)

    const mOrg = await run(organisationSpec)
    const mPrincipal = mOrg.principal
    const fullNameResult = $fullName(mPrincipal.$)
    fullNameResult.should.be.a("string").with.valueOf("Dexter Sachell")
  })
})
