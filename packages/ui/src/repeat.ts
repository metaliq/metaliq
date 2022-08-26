import { ViewResult } from "@metaliq/presentation"
import { html } from "lit"
import { getDynamicTerm, m$, Meta, MetaFn } from "metaliq"
import { up } from "@metaliq/up"

export interface RepeatSpec<T, P = any> {
  addLabel?: string | MetaFn<T, P, string>
  removeLabel?: string | MetaFn<T, P, string>
  newItem?: T extends Array<infer I> ? I | MetaFn<T, P, I> : T
}

declare module "metaliq" {
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
      <button class="mq-button" @click=${up(addItem, value)}>${getDynamicTerm("addLabel")(meta)}</button>
    </div>
  `
}

export const addItem = <T>(arr: T[]) => {
  const newItem = getDynamicTerm("newItem")(arr, m$(arr))
  arr.push(newItem)
}
