import { describe } from "mocha"
import chai from "chai"
import { applicationSpec } from "./test-specs"
import { run } from "../policies/application/application"
import { up } from "@metaliq/up"
import { meta } from "../meta"

chai.should()

export { validate } from "../policies/validation/validation"

describe("Hide / Show rules", () => {
  it("should hide or show a field depending on a rule", async () => {
    const mApplication = await run(applicationSpec)
    const appVal = mApplication.$.value

    await up(contact => {
      contact.age = 15
    }, appVal.applicant)()
    meta(appVal.applicant).isSelfEmployed.$.state.hidden.should.be.a("boolean").equal(true)

    await up(contact => {
      contact.age = 21
    }, appVal.applicant)()
    meta(appVal.applicant).isSelfEmployed.$.state.hidden.should.be.a("boolean").equal(false)
  })
})
