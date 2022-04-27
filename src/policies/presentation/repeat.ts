import { ViewResult } from "./presentation"
import { html } from "lit"
import { getSpecValue, meta, Meta, MetaFn } from "../../meta"
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

export const repeatControls = <T, P>(value: T[], meta: Meta<T[], P>): ViewResult => {
  return html`
    <div>
      <button class="mq-button" @click=${up(addItem, value)}>${getSpecValue("addLabel")(meta)}</button>
    </div>
  `
}

export const addItem = <T>(arr: T[]) => {
  const newItem = getSpecValue("newItem")(meta(arr))
  arr.push(newItem)
}
