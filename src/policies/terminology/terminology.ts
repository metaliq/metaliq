import { getSpecValue, HasMeta$, m$, MetaFn } from "../../meta"

export interface TerminologySpec<T, P = any> {
  /**
   * Primary identifying label.
   */
  label?: string | MetaFn<T, P, string>

  /**
   * Additional descriptive text.
   */
  helpText?: string | MetaFn<T, P, string>

  /**
   * Symbolic indicator (such as an icon class).
   */
  symbol?: string | MetaFn<T, P, string>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends TerminologySpec<T, P> {}
  }
}

export const label = getSpecValue("label")
export const helpText = getSpecValue("helpText")
export const symbol = getSpecValue("symbol")

/**
 * Return a full path string for the given meta within it's given ancestor.
 */
export function labelPath (from: HasMeta$<any>, to: HasMeta$<any>) {
  const labels = [labelOrKey(to)]
  while (to.$.parent && to.$.parent !== from) {
    to = to.$.parent
    const toLabel = labelOrKey(to)
    if (toLabel) labels.unshift(toLabel)
  }
  return labels.join(" > ")
}

export const labelOrKey: MetaFn<any> = (v, $ = m$(v)) => label(v, $) || $.key
