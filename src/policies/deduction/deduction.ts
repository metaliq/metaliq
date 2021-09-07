import { FieldKey, Meta } from "../../meta"

export type Deduction<T, P = any, R = any> = (meta: Meta<T, P>) => R
export type Condition<T, P = any, R = any> = (...params: any[]) => Deduction<T, P, R>

export const fieldNull: Condition<any, any, boolean> = <T>(key: FieldKey<T>) =>
  (meta: Meta<T>) => meta[key].$.value === null

export const fieldNotNull: Condition<any, any, boolean> = <T>(key: FieldKey<T>) =>
  (meta: Meta<T>) => meta[key].$.value !== null
