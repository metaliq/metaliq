import { FieldKey, Meta, MetaFn } from "../../meta"

/**
 * A deduction is a parameterised calculation factory.
 */
export type Deduction<T, P = any, R = any> = (...params: any[]) => MetaFn<T, P, R>

export const fieldNull: Deduction<any, any, boolean> = <T>(key: FieldKey<T>) =>
  (meta: Meta<T>) => meta[key].$.value === null

export const fieldNotNull: Deduction<any, any, boolean> = <T>(key: FieldKey<T>) =>
  (meta: Meta<T>) => meta[key].$.value !== null
