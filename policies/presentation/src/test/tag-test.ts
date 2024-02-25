import chai from "chai"
import { describe } from "mocha"
import { parseTagConfig } from "../tag"

chai.should()

/**
 * The `tag` function provides a general-purpose MetaView that renders a HTML tag
 * with the given configuration and content.
 *
 * Tags are a good building block for composing more complex views.
 */
describe("Tags", () => {

  /**
   * Tags can be configured with a TagOptions objects or a string that can be parsed to one
   * using the format `<tagName>#<id>.<class>`, with any number of classes.
   */
  describe("Tag Configuration", () => {

    describe("Configuring tags with a string", () => {
      const stringConfig = "p#my-para.info-block.second-col"
      const config = parseTagConfig(stringConfig)
      config.should.be.an("object")
      config.should.have.ownProperty("tagName").equals("p")
      config.should.have.ownProperty("id").equals("my-para")
      config.should.have.ownProperty("classes").equals("info-block second-col")
    })
  })
})
