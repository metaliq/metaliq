import { meta, Meta, MetaCalcs, metaSetups, MetaValue } from "../../meta"
import { addReview } from "../application/application"

export interface CalculationSpec<T, P, C> {
  /**
   * Functions for calculated fields.
   */
  calcs?: MetaCalcs<T, P, C>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P, C> extends CalculationSpec<T, P, C> {}
  }
}

metaSetups.push(meta => {
  for (const [key, calc] of Object.entries(meta.$.spec.calcs || {})) {
    addReview(meta, (value, meta) => { meta.$.calcs[key] = calc(value, meta) })
  }
})

/**
 * Shortcut to a meta's calcs
 */
export const calcs = <T, P = any, C = any> (value: T | MetaValue<T, P, C> | Meta<T, P, C>) =>
  meta(value)?.$.calcs
