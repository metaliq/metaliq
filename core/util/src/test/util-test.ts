import chai from "chai"
import { describe } from "mocha"
import { copy, filterObject } from "../util"

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

  /**
   * Objects can be filtered based on a function that inspects each key and its value
   * and determines whether it should be included in the filtered result.
   */
  describe("Object filtering", () => {
    it("Filtering nested objects", () => {
      const obj = {
        a: 1,
        b: { d: 2, e: 3, f: 7, $g: 4 },
        c: 6
      }

      const result = filterObject(obj, (k, v) =>
        !k.match(/^\$/) && // Filter out property names beginning with "$"
        (typeof v !== "number" || v <= 5)) // Filter out numeric values above 5

      result.should.be.an("object")
      result.should.have.ownProperty("a").that.equals(1)
      result.should.haveOwnProperty("b").that.is.an("object")
      result.should.not.haveOwnProperty("c")
      result.b.should.haveOwnProperty("d").equal(2)
      result.b.should.haveOwnProperty("e").equal(3)
      result.b.should.not.haveOwnProperty("f")
      result.b.should.not.haveOwnProperty("$g")
    })
  })

})
