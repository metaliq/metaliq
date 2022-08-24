import chai from "chai"
import { describe } from "mocha"
import { run } from "../policies/application/application"
import { organisationSpec } from "./test-specs"
import { up } from "@metaliq/up"

chai.should()

describe("Application state processing", () => {

  it("resets the meta-graph after any process called with `up`", async () => {
    const mApp = await run(organisationSpec)
    const app = mApp.$.value

    app.principal.firstName.should.be.a("string").equal("Dexter")

    await up(contact => { contact.firstName = "Tim" }, app.principal)()
    await up(contact => { contact.lastName = "Stewart" }, app.principal)()

    app.principal.firstName.should.be.a("string").equal("Tim")
    mApp.principal.firstName.$.value.should.be.a("string").equal("Tim")
    app.principal.lastName.should.be.a("string").equal("Stewart")
    mApp.principal.lastName.$.value.should.be.a("string").equal("Stewart")
  })

  it("handles null as a value within the meta-graph", async () => {
    const mApp = await run(organisationSpec)
    const app = mApp.$.value // The underlying value is the first parameter to meta-functions

    await up(application => { application.principal = null }, app)()

    app.should.haveOwnProperty("principal").equal(null)

    mApp.principal.should.be.an("object").with.ownProperty("$")
    mApp.principal.firstName.should.be.an("object").with.ownProperty("$")
    mApp.principal.firstName.$.should.haveOwnProperty("value").equal(undefined)
  })
})
