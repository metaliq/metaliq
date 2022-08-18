import { addDynamicState, HasMeta$, m$, Meta$, MetaFn, metaSetups } from "../../meta"

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

export interface TerminologyState {
  label?: string
  helpText?: string
  symbol?: string
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends TerminologySpec<T, P> {}
    interface State<T, P> extends TerminologyState {
      this?: State<T, P>
    }
  }
}

metaSetups.push(<T>($: Meta$<T>) => {
  addDynamicState($, "label")
  addDynamicState($, "helpText")
  addDynamicState($, "symbol")
})

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

export const labelOrKey: MetaFn<any> = (v, $ = m$(v)) => $.state.label || $.key
