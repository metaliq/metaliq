import { MetaFn } from "../metaliq"

export interface TerminologyTerms<T, P = any> {
  /**
   * Primary identifying label.
   */
  label?: string | MetaFn<T, P, string>
}

declare module "../metaliq" {
  namespace Policy {
    interface Terms<T, P> extends TerminologyTerms<T, P> {}
  }
}
