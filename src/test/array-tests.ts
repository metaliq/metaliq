import chai from "chai"
import { describe } from "mocha"
import { metafy, metaProxy, MetaSpec } from "../meta"

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
      fields: { aliases: { label: "Aliases", items: { } } }
    }

    it("should metafy an array without an items definition to an empty MetaArray", () => {
      const personMeta = metafy(personSpecNoItems, samplePerson)

      personMeta.should.be.an("object")
      personMeta.aliases.should.be.an("array")
      personMeta.aliases.should.have.length(0)
    })

    it("should metafy an array of primitives to an array of metas for those primitives", () => {
      const personMeta = metafy(personSpecWithItems, samplePerson)

      personMeta.should.be.an("object")
      personMeta.aliases.should.be.an("array")
      personMeta.aliases.should.have.length(2)
    })

    it("should proxify to a reflection of an array of primitives regardless of items definition", () => {
      const personWithItemsMeta = metafy(personSpecWithItems, samplePerson)
      const personWithItemsProxy = metaProxy(personWithItemsMeta)

      personWithItemsProxy.aliases.should.be.an("array")
      personWithItemsProxy.aliases.should.have.length(2)
      personWithItemsProxy.aliases[0].should.equal("One")

      const personNoItemsMeta = metafy(personSpecNoItems, samplePerson)
      const personNoItemsProxy = metaProxy(personNoItemsMeta)

      personNoItemsProxy.aliases.should.be.an("array")
      personNoItemsProxy.aliases.should.have.length(2)
      personNoItemsProxy.aliases[0].should.equal("One")
    })
  })
})
