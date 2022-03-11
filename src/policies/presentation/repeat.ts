import { ViewResult } from "./presentation"
import { html } from "lit"
import { getSpecValue, Meta, MetaArray, MetaFn, metafy } from "../../meta"
import { up } from "@metaliq/up"

export interface RepeatSpec<T, P = any> {
  addLabel?: string | MetaFn<T, P, string>
  removeLabel?: string | MetaFn<T, P, string>
  newItem?: T extends Array<infer I> ? I | MetaFn<T, P, I> : T
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends RepeatSpec<T, P> { }
  }
}

export const defaultRepeatSpec: RepeatSpec<any> = {
  addLabel: "Add Item",
  removeLabel: "Remove Item",
  newItem: {}
}

export const repeatControls = <T, P>(meta: Meta<T[], P>): ViewResult => {
  const metaArr = <unknown>meta as MetaArray<any>

  return html`
    <div>
      <button class="mq-button" @click=${up(addItem, metaArr)}>${getSpecValue("addLabel")(meta)}</button>
    </div>
  `
}

export const addItem = <T, P>(arr: MetaArray<T, P>) => {
  const newMeta = metafy(arr.$.spec.items, getSpecValue("newItem")(arr) || {}, arr.$.parent, arr.$.key)
  arr.push(newMeta)
}
