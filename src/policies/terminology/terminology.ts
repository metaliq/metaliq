import { getSpecValue, Meta, MetaFn } from "../../meta"

export interface TerminologySpec<T, P> {
  label?: string | MetaFn<T, P>
  helpText?: string | MetaFn<T, P>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends TerminologySpec<T, P> {}
  }
}

export const label = getSpecValue("label")

export const labelOrKey = (meta: Meta<any>) => label(meta) || meta.$.key
