import chai from "chai"
import { describe } from "mocha"
import { run } from "../policies/application/application"
import { applicationSpec } from "./test-specs"
import { up } from "@metaliq/up"

chai.should()

describe("Application state processing", () => {

  it("resets the meta-graph after any process called with `up`", async () => {
    const mApp = await run(applicationSpec)
    const app = mApp.$.value

    app.applicant.firstName.should.be.a("string").equal("")

    await up(contact => { contact.firstName = "Tim" }, app.applicant)()
    await up(contact => { contact.lastName = "Stewart" }, app.applicant)()

    app.applicant.firstName.should.be.a("string").equal("Tim")
    mApp.applicant.firstName.$.value.should.be.a("string").equal("Tim")
    app.applicant.lastName.should.be.a("string").equal("Stewart")
    mApp.applicant.lastName.$.value.should.be.a("string").equal("Stewart")
  })

  it("handles null as a value within the meta-graph", async () => {
    const mApp = await run(applicationSpec)
    const app = mApp.$.value // The underlying value is the first parameter to meta-functions

    await up(application => { application.applicant = null }, app)()

    app.should.haveOwnProperty("applicant").equal(null)

    mApp.applicant.should.be.an("object").with.ownProperty("$")
    mApp.applicant.firstName.should.be.an("object").with.ownProperty("$")
    mApp.applicant.firstName.$.should.haveOwnProperty("value").equal(undefined)
  })
})
