import { FieldKey, Meta, MetaFn } from "../../meta"

export type Condition<T, P = any, R = any> = (...params: any[]) => MetaFn<T, P, R>

export const fieldNull: Condition<any, any, boolean> = <T>(key: FieldKey<T>) =>
  (meta: Meta<T>) => meta[key].$.value === null

export const fieldNotNull: Condition<any, any, boolean> = <T>(key: FieldKey<T>) =>
  (meta: Meta<T>) => meta[key].$.value !== null
