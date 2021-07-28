import { Meta } from "../../meta"

export interface TerminologySpec {
  label?: string
  helpText?: string
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends TerminologySpec {
      this?: Specification<T, P>
    }
  }
}

/**
 * Return a display path string for the given meta within it's given ancestor.
 */
export function labelPath (from: Meta<any>, to: Meta<any>) {
  const labels = [to.$.spec.label]
  while (to.$.parent && to.$.parent !== from) {
    to = to.$.parent
    if (to.$.spec.label) labels.unshift(to.$.spec.label)
  }
  return labels.join(" > ")
}
