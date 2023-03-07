import { should, expect } from "chai"
import { startUp, up } from "../up"

should()

/**
 * The `@metaliq/up` package provides a reactive state update system that is designed
 * to be agnostic of any other processing or rendering framework or functionality.
 *
 * It works very well with MetaliQ, and particularly with the `lit` based
 * rendering provided by the `@metaliq/presentation` package - but it has no
 * dependencies on either (or indeed on anything else) - it is self contained,
 * with a pluggable "review" mechanism that allows for the default processing / rendering
 * activity to occur within any typical reactive application cycle.
 *
 * The usage samples here show `up` being used without other parts of MetaliQ, but normally
 * you would use it within the context of `@metaliq/application` and `@metaliq/presentation`,
 * so the examples there will also be useful.
 */
describe("@metaliq/up", () => {

  /**
   * The update mechanism provided by this package is delivered as a function called `up`.
   * This can be created using the module-level function `startUp`, which returns the created
   * update mechanism function and also assigns it to the module-level exported variable `up`.
   *
   * So the central application framework (e.g. `@metaliq/application`) sets up and creates the
   * update mechanism, and every other module can access it using:
   *
   * ```
   * import { up } from `@metaliq/up`
   */
  it("Accessing the `up` function", async () => {
    expect(up).to.equal(undefined)

    const startedUp = await startUp({})

    up.should.be.equal(startedUp)
  })

})
