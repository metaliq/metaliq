import chai from "chai"
import { describe } from "mocha"
import { metafy, MetaModel } from "../metaliq"

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
  type Person = {
    aliases: string[]
  }

  const samplePerson: Person = {
    aliases: ["One", "Two"]
  }

  const personModelNoItems: MetaModel<Person> = {
    fields: {
      aliases: {
        label: "Aliases"
      }
    }
  }

  const personModelWithItems: MetaModel<Person> = {
    fields: { aliases: { label: "Aliases", items: { label: "Alias" } } }
  }

  /**
   * Sometimes the array is made up of primitive values (numbers, strings or booleans).
   */
  describe("Primitive Arrays", () => {

    /**
     * An array without an items definition metafies to a MetaArray with empty model for each item.
     */
    it("Missing Item Definition", () => {
      const personMeta = metafy(personModelNoItems, samplePerson)

      personMeta.should.be.an("object")
      personMeta.aliases.should.be.an("array")
      personMeta.aliases.should.have.length(2)
      personMeta.aliases[0].should.have.property("$")
      personMeta.aliases[0].$.model.should.not.have.property("label")
    })

    /**
     * An array of primitives metafies to an array of metas for those primitives.
     */
    it("Primitive Values", () => {
      const personMeta = metafy(personModelWithItems, samplePerson)

      personMeta.should.be.an("object")
      personMeta.aliases.should.be.an("array")
      personMeta.aliases.should.have.length(2)
      personMeta.aliases[0].should.have.property("$")
      personMeta.aliases[0].$.model.should.have.property("label")
    })

  })

  /**
   * There are various typical scenarios for assigning arrays.
   */
  describe("Array Assigment", () => {

    /**
     * Normally whenever you assign a new value to an array the underlying data value
     * identity itself changes to reference the assigned value.
     *
     * Meta value identities are preserved.
     */
    it("Normally Assigned Array Identity", () => {
      const { aliases } = metafy(personModelWithItems, samplePerson)
      const oldMeta = aliases.$
      const oldValue = oldMeta.value

      aliases.$.value = ["New", "Aliases"]

      const newMeta = aliases.$
      const newValue = aliases.$.value

      newMeta.should.equal(oldMeta)
      newValue.should.not.equal(oldValue)
    })

    /**
     * Sometimes you want to ensure that the associated value retains
     * its object identity when changing its content directly via its metavalue.
     * This could be the case, for example, when refreshing the content
     * of an array that is shared at various points in the meta-graph.
     * You can achieve this with a normal JS splice operation.
     */
    it("Preserving Array Identity on Assigment", () => {
      const { aliases } = metafy(personModelWithItems, samplePerson)
      const oldMeta = aliases.$
      const oldValue = oldMeta.value as any[]

      oldValue.splice(0, oldValue.length, ["New", "Aliases"])

      const newMeta = aliases.$
      const newValue = aliases.$.value

      newMeta.should.equal(oldMeta)
      newValue.should.equal(oldValue)
    })
  })
})
