import chai from "chai"
import { describe } from "mocha"
import { meta, metafy, reset } from "../meta"
import { organisationSpec, emptyOrganisation } from "./test-specs"

chai.should()

describe("Underlying data value object", () => {
  const mApp = metafy(organisationSpec, emptyOrganisation())

  it("is accessible from any equivalent path in the meta-graph", () => {
    mApp.$.value.principal.should.equal(mApp.principal.$.value)
  })

  it("returns nested primitive values", () => {
    mApp.principal.firstName.$.value.should.be.a("string").equals("")
  })

  it("has mutable values, which can be reset into the meta-graph", () => {
    mApp.principal.$.value.firstName = "Tim"
    mApp.principal.$.value.firstName.should.be.a("string").equals("Tim")
    // Value on parent meta object is not currently set
    mApp.principal.firstName.$.value.should.be.a("string").equals("")

    // Reset top-level meta (this is generally done automatically by the application policy)
    reset(mApp.$)

    mApp.principal.firstName.$.value.should.be.a("string").equals("Tim")
  })

  it("can be replaced, and have the associated meta-graph reestablished", () => {
    mApp.$.value.principal = {
      firstName: "Bob",
      lastName: "Blue",
      age: 12
    }

    mApp.$.value.principal.should.not.haveOwnProperty("$")
    mApp.principal.firstName.$.value.should.be.a("string").equal("Tim")

    // Done automatically on conclusion of a application state update
    reset(mApp.$)
    mApp.$.value.principal.should.haveOwnProperty("$").equal(mApp.principal.$)

    meta(mApp.$.value.principal).should.equal(mApp.principal)
    mApp.principal.firstName.$.value.should.be.a("string").equal("Bob")
  })
})
