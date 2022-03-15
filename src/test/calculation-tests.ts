import chai from "chai"
import { describe, it } from "mocha"
import { metaFn, MetaSpec } from "../meta"
import { run } from "../policies/application/application"
import { initCalculationPolicy } from "../policies/calculation/calculation"

chai.should()

initCalculationPolicy()

describe("metaliq/policies/calculation", () => {
  describe("a basic calculation", () => {
    type Contact = {
      firstName: string
      lastName: string
    }

    const contactSpec: MetaSpec<Contact> = {
      calcs: {
        fullName: metaFn(contact => `${contact.firstName} ${contact.lastName}`)
      },
      init: {
        firstName: "Tom",
        lastName: "Sawyer"
      }
    }

    it("should perform a calculation when the spec is run", async () => {
      const mContact = await run(contactSpec)

      mContact.$.state.calcs.fullName.should.be.a("string").equals("Tom Sawyer")
    })
  })
})
