import { getSpecValue, Meta, MetaFn } from "../../meta"

export interface TerminologySpec<T, P = any, C = any> {
  label?: string | MetaFn<T, P, C>
  helpText?: string | MetaFn<T, P, C>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P, C> extends TerminologySpec<T, P, C> {}
  }
}

export const label = getSpecValue("label")

export const labelOrKey = (meta: Meta<any>) => label(meta) || meta.$.key
