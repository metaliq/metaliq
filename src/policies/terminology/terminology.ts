import { getSpecValue, Meta, MetaFn } from "../../meta"

export interface TerminologySpec<T, P = any, C = any> {
  /**
   * Primary identifying label.
   */
  label?: string | MetaFn<T, P, C, string>

  /**
   * Additional descriptive text.
   */
  helpText?: string | MetaFn<T, P, C, string>

  /**
   * Symbolic indicator (such as an icon class).
   */
  symbol?: string | MetaFn<T, P, C, string>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P, C> extends TerminologySpec<T, P, C> {}
  }
}

export const label = getSpecValue("label")
export const helpText = getSpecValue("helpText")
export const symbol = getSpecValue("symbol")

/**
 * Return a full path string for the given meta within it's given ancestor.
 */
export function labelPath (from: Meta<any>, to: Meta<any>) {
  const labels = [label(to)]
  while (to.$.parent && to.$.parent !== from) {
    to = to.$.parent
    const toLabel = label(to)
    if (toLabel) labels.unshift(toLabel)
  }
  return labels.join(" > ")
}

export const labelOrKey = (meta: Meta<any>) => label(meta) || meta.$.key
