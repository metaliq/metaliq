import { describe } from "mocha"
import chai from "chai"
import { organisationModel } from "./test-models"
import { run } from "@metaliq/application"
import { up } from "@metaliq/up"

chai.should()

export { validate } from "@metaliq/validation"

describe("Hide / Show rules", () => {
  it("should hide or show a field depending on a rule", async () => {
    const mApplication = await run(organisationModel)
    const appVal = mApplication.$.value

    await up(contact => {
      contact.age = 15
    }, appVal.principal)()
    mApplication.principal.isSelfEmployed.$.my("hidden").should.be.a("boolean").equal(true)

    await up(contact => {
      contact.age = 21
    }, appVal.principal)()
    mApplication.principal.isSelfEmployed.$.my("hidden").should.be.a("boolean").equal(false)
  })
})
