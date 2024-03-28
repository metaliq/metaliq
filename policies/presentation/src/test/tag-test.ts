import chai from "chai"
import { describe } from "mocha"
import { parseTagConfig, t, tag } from "../tag"
import { field } from "../presentation"
import { MetaModel } from "metaliq"

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

  /**
   * The Typescript compiler can infer some aspects of the body content of a typed tag.
   */
  describe("Tag Content Type Inference", () => {
    type Thing = { name: string, description: string }

    /**
     * If you want the body of a tag (or any other configurable container meta view)
     * to be checked for type safety (which you should for dynamic content)
     * it is necessary EITHER to provide type information to the tag itself,
     * OR to wrap the container item in the special typing structure `t`,
     * which then properly infers type information from the containing meta model.
     *
     * This is due to Typescript not inferring types backward through chained function calls.
     */
    it("Configurable Container MetaView body type inference", () => {
      // Compiles with valid field name
      tag<Thing>(".some-config")(v => `Hello ${v.name}`)
      // Field name typo - would fail to compile
      // tag<Thing>(".some-config")(v => `Hello ${v.name1}`)

      const mySpan = tag("span")

      const mm: MetaModel<Thing> = {
        view: [
          field("name"),
          t(mySpan, [
            v => v.name
          ])
        ]
      }
      mm.should.be.an("object")

      // Assigning a tag to a variable with a particular meta view type DOESN'T type the content
      // const x: MetaView<Thing> = tag()(v => `Hello ${v.misspelled}`)
      // return x
    })

    /**
     * Tag content within an array or nested array will also be properly checked
     * if type information is added to the tag.
     */
    it("Array body content type inference", () => {
      tag<Thing>(".some-config")([
        v => `Hello ${v.name}`,
        [
          v => `Hello ${v.name}`
        ]
      ])
    })

    /**
     * Typescript is unable to infer that an inner tag shares
     * the same generic type as its containing tag,
     * and so if it is not typed itself it reverts to `any`.
     */
    it("Nested tag type inference", () => {
      // // The content of the inner tag is NOT typechecked
      // tag<Thing>(".outer-config")(tag(".inner-config")(v => v.misspelled))
      //
      // // When adding inner typing, the field name must be valid.
      // tag<Thing>(".outer-config")(tag<Thing>(".inner-config")(v => v.name))
    })
  })
})
