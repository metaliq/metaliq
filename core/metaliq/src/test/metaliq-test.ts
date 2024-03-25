import { modelKeys, MetaModel } from "../metaliq"
import * as chai from "chai"

chai.should()

/**
 * The core module of MetaliQ is `metaliq`.
 *
 * Usually, `metaliq` would be used along with a set of additional modules,
 * typically others from the `@metaliq` NPM organisation scope,
 * in order to provide a range of system functionality to be leveraged in a solution.
 *
 * However, this set of usage examples show the operation of the core patterns
 * and functions of `metaliq` itself, independent of any other modules.
 */
describe("MetaliQ - the core module", () => {

  /**
   * MetaModels are based on a particular data type within the underlying data model,
   * and can contain entries for the fields of that type.
   *
   * Each field entry is itself another MetaModel, based on that field's data type.
   *
   * Not all fields within the underlying data type need to be included as field entries
   * in a MetaModel, but it's important to remember that if you _don't_ include them
   * then they will not have any associated node in the MetaGraph, and no associated
   * MetaInfo. This means they won't get included in derived structures, like a MetaForm.
   */
  describe("MetaModel Fields", () => {

    /**
     * Sometimes it's helpful to get access the declared keys of a MetaModel.
     * The `fieldKeys` function is available to provide this information.
     */
    it("Getting MetaModel field keys", () => {
      // First declare the datatype to be used.
      // TODO: Put this in some other construct where we can document module-level variables/exports
      type Customer = {
        firstName: string
        lastName: string
        email: string
        phone: string
      }

      const customerModel: MetaModel<Customer> = {
        fields: {
          firstName: {
            // Note that these MetaModel declarations are empty.
            // Nevertheless, their inclusion will make firstName and lastName show up in `fieldKeys`,
            // and also be represented in various derived constructs, such as a MetaForm.
          },
          lastName: {}
          // On the other hand, the fields `email` and `phone` won't be included in `fieldKeys`,
          // or in any MetaForm based on this model.
        }
      }

      const keys = modelKeys(customerModel)
      // Typescript infers that `keys` has type `MetaModelField<Customer>[]`.

      const expectedKeys = ["firstName", "lastName"]

      keys.should.have.members(expectedKeys)
      keys.should.not.include("email")
      keys.should.not.include("phone")

      for (const key of keys) {
        // Typescript infers that key has type `keyof Customer`.
        key.should.be.a("string")
        expectedKeys.should.include(key)
      }
    })
  })
})
