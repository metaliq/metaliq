import chai from "chai"
import { describe } from "mocha"
import { review, run } from "../policies/application/application"
import { applicationSpec } from "./test-specs"
import { up } from "@metaliq/up"
import { meta } from "../meta"

chai.should()

describe("Application state processing", () => {

  it("should update calculations based upon the values", async () => {
    const mApplication = await run(applicationSpec)
    const value = mApplication.$.value

    value.applicant.firstName.should.be.a("string").equal("")

    await up(contact => { contact.firstName = "Tim" }, value.applicant)()
    await up(contact => { contact.lastName = "Stewart" }, value.applicant)()

    value.applicant.firstName.should.be.a("string").equal("Tim")
    value.applicant.lastName.should.be.a("string").equal("Stewart")

    // Would happen in any `view` of the applicant
    review(meta(value.applicant))
  })
})
