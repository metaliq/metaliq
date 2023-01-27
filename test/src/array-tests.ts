import chai from "chai"
import { describe } from "mocha"
import { metafy, MetaModel } from "metaliq"

chai.should()

/**
 * The data model of a digital solution will often include collections of values,
 * for example a list of contacts, multiple classes on a driver's licence,
 * a range of upcoming events, etc.
 *
 * MetaliQ handles arrays within the data model in quite a similar way to non-array objects,
 * with some differences specific to arrays. These are described in the code samples below.
 */
describe("MetaliQ Array Handling", () => {

  /**
   * Sometimes the array is made up of primitive values (numbers, strings or booleans).
   */
  describe("Primitive Arrays", () => {
    type Person = {
      aliases: string[]
    }

    const samplePerson: Person = {
      aliases: ["One", "Two"]
    }

    const personSpecNoItems: MetaModel<Person> = {
      fields: {
        aliases: {
          label: "Aliases"
        }
      }
    }

    const personSpecWithItems: MetaModel<Person> = {
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

  })
})
