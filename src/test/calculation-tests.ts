import chai from "chai"
import { describe, it } from "mocha"
import { MetaCalcs, metaCall, MetaSpec } from "../meta"
import { run } from "../policies/application/application"
import { calcs } from "../policies/calculation/calculation"
import { up } from "@metaliq/up"

chai.should()

describe("metaliq/policies/calculation", () => {
  describe("a basic calculation", () => {
    type Contact = {
      firstName: string
      lastName: string
    }

    // Demonstrates how we can optionally define a type for the calculated fields.
    type ContactCalcs = {
      fullName: string
    }

    const contactCalcFns: MetaCalcs<Contact, any, ContactCalcs> = {
      fullName: contact => {
        return `${contact.firstName} ${contact.lastName}`
      }
    }

    const contactSpec: MetaSpec<Contact> = {
      calcs: contactCalcFns, // Here there is an implicit check that ContactCalcs indeed satisfies Calcs<Contect>
      init: {
        firstName: "Tom",
        lastName: "Sawyer"
      }
    }

    it("should perform a calculation when the spec is run", async () => {
      const mContact = await run(contactSpec)

      // Using the ability to optionally type our calc results
      const contactCalcs = <ContactCalcs>calcs(mContact)

      // Our IDE now knows that contactCalcResults has a property `fullName` of type string
      contactCalcs.fullName.should.be.a("string").equals("Tom Sawyer")
    })

    it("should update a calculation when a state transition is made", async () => {
      const mContact = await run(contactSpec)

      // Using the ability to optionally type our calc results
      const contactCalcs = <ContactCalcs>calcs(mContact)

      // Our IDE now knows that contactCalcResults has a property `fullName` of type string
      contactCalcs.fullName.should.be.a("string").equals("Tom Sawyer")

      await up(metaCall((contact: Contact) => {
        contact.firstName = "Huckleberry"
      }), mContact)()

      contactCalcs.fullName.should.equal("Huckleberry Sawyer")
    })
  })
})
