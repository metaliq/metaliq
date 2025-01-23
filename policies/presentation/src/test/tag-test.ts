import chai from "chai"
import { describe } from "mocha"
import { parseTagConfig, tag } from "../tag"
import { $fn, MetaModel } from "metaliq"

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
      config.should.have.ownProperty("name").equals("p")
      config.should.have.ownProperty("id").equals("my-para")
      config.should.have.ownProperty("classes").equals("info-block second-col")
    })
  })

  /**
   * The Typescript compiler can infer some aspects of the body content of a typed tag.
   */
  describe("Tag Content Type Inference", () => {
    type Thing = { name: string, status: string }

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
      // Typed tag compiles with valid field name
      tag<Thing>(".some-config", $ => `Hello ${$.value.name}`)
      // Typos will not compile
      // newTag<Thing>(".some-config", "", v => `Hello ${v.wrongName}`)

      const mm: MetaModel<Thing> = {
        view: [
          // Tag infers type from the MetaModel, `v` is Thing
          tag("span", $fn(v => v.name)),

          // Type inference for each configuration property including nested objects
          tag(["span", { classes: $fn(v => [v.name]), onClick: $fn(v => { console.log(v.name) }) }], $fn(v => v.name)),

          // Typos will not compile
          // newTag("span", { classes: v => [v.wrongName] }, v => v.wrongName),

          // Type inference passed down throughout the view hierarchy
          tag(".outer", [
            tag(".middle", [
              tag(".inner", [
                // Typos will not compile
                // v => v.wrongName,
                // Valid field names will
                $fn(v => v.name)
              ])
            ])
          ])
        ]
      }
      mm.should.be.an("object")
    })

    /**
     * Tag content within an array or nested array will also be properly checked
     * if type information is added to the tag.
     */
    it("Array body content type inference", () => {
      tag<Thing>(".some-config", [
        $fn(v => `Hello ${v.name}`),
        [
          $fn(v => `Hello ${v.name}`)
        ]
      ])
    })
  })
})
