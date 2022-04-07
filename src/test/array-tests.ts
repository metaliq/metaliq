import chai from "chai"
import { describe } from "mocha"
import { metafy, MetaSpec } from "../meta"

chai.should()

describe("MetaliQ Array Handling", () => {
  describe("Primitive Arrays", () => {
    type Person = {
      aliases: string[]
    }

    const samplePerson: Person = {
      aliases: ["One", "Two"]
    }

    const personSpecNoItems: MetaSpec<Person> = {
      fields: {
        aliases: {
          label: "Aliases"
        }
      }
    }

    const personSpecWithItems: MetaSpec<Person> = {
      fields: { aliases: { label: "Aliases", items: { label: "Alias" } } }
    }

    it("should metafy an array without an items definition to a MetaArray with empty spec for each item", () => {
      const personMeta = metafy(personSpecNoItems, samplePerson)

      personMeta.should.be.an("object")
      personMeta.aliases.should.be.an("array")
      personMeta.aliases.should.have.length(2)
      personMeta.aliases[0].should.have.property("$")
      personMeta.aliases[0].$.spec.should.not.have.property("label")
    })

    it("should metafy an array of primitives to an array of metas for those primitives", () => {
      const personMeta = metafy(personSpecWithItems, samplePerson)

      personMeta.should.be.an("object")
      personMeta.aliases.should.be.an("array")
      personMeta.aliases.should.have.length(2)
      personMeta.aliases[0].should.have.property("$")
      personMeta.aliases[0].$.spec.should.have.property("label")
    })

    it("should proxify to a reflection of an array of primitives regardless of items definition", () => {
      const personWithItemsMeta = metafy(personSpecWithItems, samplePerson)
      const personWithItems = personWithItemsMeta.$.value

      personWithItems.aliases.should.be.an("array")
      personWithItems.aliases.should.have.length(2)
      personWithItems.aliases[0].should.equal("One")

      const personNoItemsMeta = metafy(personSpecNoItems, samplePerson)
      const personNoItems = personNoItemsMeta.$.value

      personNoItems.aliases.should.be.an("array")
      personNoItems.aliases.should.have.length(2)
      personNoItems.aliases[0].should.equal("One")
    })
  })
})
