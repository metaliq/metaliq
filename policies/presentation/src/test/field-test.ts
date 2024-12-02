import chai from "chai"
import { describe } from "mocha"
import { tag } from "../tag"
import { MetaModel } from "metaliq"
import { field } from "../presentation"

chai.should()

export type Thing = {
  name: string
  status: string
}

describe("Field Presentation", () => {

  describe("Type inference", () => {

    it("Infers type from field", () => {
      const mm: MetaModel<Thing> = {
        view: field("name", v => v.toLowerCase())
      }

      mm.should.be.an("object")
    })

    it("Infers type when used within a tag", () => {
      const mm: MetaModel<Thing> = {
        view: tag(".my-class", field("name", v => v.toLowerCase()))
      }

      mm.should.be.an("object")
    })

    it("Infers type when used within a tag array body parameter", () => {
      const mm: MetaModel<Thing> = {
        view: tag(".my-class", [field("name", v => v.toLowerCase())])
      }

      mm.should.be.an("object")
    })

    it("Infers type when used within a tag in a tag array parameter", () => {
      const mm: MetaModel<Thing> = {
        view: tag(".my-class", [field("name", [
          tag(".inner-class", v => v.toLowerCase())
        ])])
      }

      mm.should.be.an("object")
    })

  })

  describe("Type inference with tag body property", () => {
    it("Infers type when used within a tag", () => {
      const mm: MetaModel<Thing> = {
        view: tag([
          ".my-class",
          { body: field("name", v => v.toLowerCase()) }
        ])
      }

      mm.should.be.an("object")
    })

    it("Infers type when used within a tag in a tag array body property", () => {
      const mm: MetaModel<Thing> = {
        view: tag(".my-class", [field("name", [
          tag(".inner-class", v => v.toLowerCase())
        ])])
      }

      mm.should.be.an("object")
    })
  })
})
