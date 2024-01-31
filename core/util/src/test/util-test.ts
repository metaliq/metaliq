import chai from "chai"
import { describe } from "mocha"
import { copy } from "../util"

chai.should()

/**
 * MetaliQ comes with a package of general utilities that cover
 * commonly used functionality.
 */
describe("MetaliQ Utilities", () => {

  /**
   * It is sometimes convenient to make a deeply nested dereferenced copy of an object.
   */
  describe("The copy function", () => {

    it("Copying nested objects", () => {
      const inner = { a: 1, b: "two", c: ["three"] }
      const original = { inner }

      original.inner.should.equal(inner)

      const duplicate = copy(original)

      duplicate.should.not.equal(original)
      duplicate.should.have.ownProperty("inner")
      duplicate.inner.should.not.equal(inner)
      duplicate.inner.should.have.ownProperty("a").equals(1)
      duplicate.inner.should.have.ownProperty("b").equals("two")
      duplicate.inner.should.have.ownProperty("c")
      duplicate.inner.c.should.be.an("array").of.length(1)
      duplicate.inner.c.should.not.equal(inner.c)
    })
  })

})
