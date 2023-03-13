import { addDynamicState, HasMeta$, m$, Meta$, MetaFn, metaSetups } from "metaliq"

export interface TerminologyTerms<T, P = any> {
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

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends TerminologyTerms<T, P> {}
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
export function labelPath (from: Meta$<any>, to: Meta$<any>) {
  const labels = [labelOrKey(to)]
  while (to.parent && to.parent !== from) {
    to = to.parent
    const toLabel = labelOrKey(to)
    if (toLabel) labels.unshift(toLabel)
  }
  return labels.join(" > ")
}

/**
 * Return the field's label, or key if none.
 * Can accept the meta info $ object (recommended)
 * or its associated data value (not a primitive).
 */
export const labelOrKey = <T, P>(v$: T | Meta$<T, P>) => {
  const $ = (m$(v$) || v$) as Meta$<T, P>
  return $.state.label || $.key
}
