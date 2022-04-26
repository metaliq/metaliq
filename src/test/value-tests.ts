import chai from "chai"
import { describe } from "mocha"
import { metafy, reset } from "../meta"
import { applicationSpec, emptyApplication } from "./test-specs"

chai.should()

describe("The Meta-Graph and underlying values", () => {
  const meta = metafy(applicationSpec, emptyApplication())

  it("should return underlying values", () => {
    meta.applicant.firstName.$.value.should.be.a("string").equals("")
  })

  it("should have mutable values", () => {
    meta.applicant.$.value.firstName = "Tim"
    meta.applicant.$.value.firstName.should.be.a("string").equals("Tim")
    // Value on parent meta object is not currently set
    meta.applicant.firstName.$.value.should.be.a("string").equals("")
    // Reset top-level meta (this is generally done automatically by the application policy)
    reset(meta)
    meta.applicant.firstName.$.value.should.be.a("string").equals("Tim")
  })
})
