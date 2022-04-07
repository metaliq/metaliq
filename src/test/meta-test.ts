import chai from "chai"
import { describe } from "mocha"
import { run } from "../policies/application/application"
import { applicationSpec } from "./test-specs"
import { up } from "@metaliq/up"
import { calcs } from "../policies/calculation/calculation"

chai.should()

describe("Data values and meta information", () => {

  it("should perform calculations based upon the values", async () => {
    const meta = await run(applicationSpec)
    const value = meta.$.value

    value.applicant.firstName.should.be.a("string").equal("")

    await up(contact => { contact.firstName = "Tim" }, value.applicant)()
    await up(contact => { contact.lastName = "Stewart" }, value.applicant)()

    value.applicant.firstName.should.be.a("string").equal("Tim")
    value.applicant.lastName.should.be.a("string").equal("Stewart")

    calcs(value.applicant).fullName.should.be.a("string").equal("Tim Stewart")
  })
})
