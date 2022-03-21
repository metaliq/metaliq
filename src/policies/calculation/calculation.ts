import { FieldKey, Meta, MetaFn, metaSetups } from "../../meta"
import { addReview } from "../application/application"

/**
 * Type for calculated field functions for a Meta object.
 * This can be narrowed to a specific set of calcs C,
 * allowing results to also be cast to C.
 */
export type CalcFns<T, P = any, C = any> = {
  [K in FieldKey<C>]: MetaFn<T, P, C[K]>
}

export interface CalculationSpec<T, P> {
  /**
   * Functions for calculated fields.
   */
  calcFns?: CalcFns<T, P, any>
}

export interface CalculationState {
  /**
   * Results of calcFns.
   */
  calcs?: any
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends CalculationSpec<T, P> {}
    interface State<T, P> extends CalculationState{
      this?: State<T, P>
    }
  }
}

// TODO: Initialise calcs in review on meta-setup
metaSetups.push(meta => {
  const { spec, state } = meta.$
  for (const [key, calc] of Object.entries(spec.calcFns || {})) {
    state.calcs = state.calcs || {}
    addReview(meta, meta => { state.calcs[key] = calc(meta) })
  }
})

export const calcs = (meta: Meta<any>) => meta?.$.state.calcs
