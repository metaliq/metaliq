import { FieldKey, MetaFn, metaSetups } from "../../meta"
import { addReview } from "../application/application"

/**
 * A set of calculated values for a Meta object of the given type.
 */
export interface Calcs<T, P> {
  [calc: string]: MetaFn<T, P>
}

/**
 * The results for a particular set of TypeCalcs.
 */
export type CalcResults<T, P, TC extends Calcs<T, P>> = {
  [C in FieldKey<TC>]: TC[C] extends MetaFn<T, P, infer R> ? R : never
}

export interface CalculationSpec<T, P> {
  calcs?: Calcs<T, P>
}

export interface CalculationState<T, P> {
  /**
   * Result of derived calculations for this meta.
   * Due to lack of HKTs in TypeScript, this will need to be cast to
   * `CalcResults<T, P, YourKnownCalcs>`
   * where YourKnownCalcs is the type of `calcs` provided in the Spec.
   */
  calcs?: CalcResults<T, P, any>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends CalculationSpec<T, P> {}
    interface State<T, P> extends CalculationState<T, P>{}
  }
}

// TODO: Initialise calcs in review on meta-setup
metaSetups.push(meta => {
  const { spec, state } = meta.$
  for (const [key, calc] of Object.entries(spec.calcs || {})) {
    state.calcs = state.calcs || {}
    addReview(meta, meta => { state.calcs[key] = calc(meta) })
  }
})

export function initCalculationPolicy () {
  console.log("Calculation policy loaded")
}
