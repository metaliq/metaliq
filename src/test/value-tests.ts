import chai from "chai"
import { describe } from "mocha"
import { meta, metafy, reset } from "../meta"
import { applicationSpec, emptyApplication } from "./test-specs"

chai.should()

describe("Underlying data value object", () => {
  const mApp = metafy(applicationSpec, emptyApplication())

  it("is accessible from any equivalent path in the meta-graph", () => {
    mApp.$.value.applicant.should.equal(mApp.applicant.$.value)
  })

  it("returns nested primitive values", () => {
    mApp.applicant.firstName.$.value.should.be.a("string").equals("")
  })

  it("has mutable values, which can be reset into the meta-graph", () => {
    mApp.applicant.$.value.firstName = "Tim"
    mApp.applicant.$.value.firstName.should.be.a("string").equals("Tim")
    // Value on parent meta object is not currently set
    mApp.applicant.firstName.$.value.should.be.a("string").equals("")

    // Reset top-level meta (this is generally done automatically by the application policy)
    reset(mApp)

    mApp.applicant.firstName.$.value.should.be.a("string").equals("Tim")
  })

  it("can be replaced, and have the associated meta-graph reestablished", () => {
    mApp.$.value.applicant = {
      firstName: "Bob",
      lastName: "Blue",
      age: 12
    }

    mApp.$.value.applicant.should.not.haveOwnProperty("$")
    mApp.applicant.firstName.$.value.should.be.a("string").equal("Tim")

    // Done automatically on conclusion of a application state update
    reset(mApp)
    mApp.$.value.applicant.should.haveOwnProperty("$").equal(mApp.applicant.$)

    meta(mApp.$.value.applicant).should.equal(mApp.applicant)
    mApp.applicant.firstName.$.value.should.be.a("string").equal("Bob")
  })
})
