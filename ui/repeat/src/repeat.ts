import { MetaView, ViewResult } from "@metaliq/presentation"
import { html } from "lit"
import { $args, getDynamicTerm, m$, MetaFn } from "metaliq"
import { up } from "@metaliq/up"

export interface RepeatTerms<T, P = any> {
  addLabel?: string | MetaFn<T, P, string>
  removeLabel?: string | MetaFn<T, P, string>
  newItem?: T extends Array<infer I> ? I | MetaFn<T, P, I> : T
}

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends RepeatTerms<T, P> { }
  }
}

export const defaultRepeatTerms: RepeatTerms<any> = {
  addLabel: "Add Item",
  removeLabel: "Remove Item",
  newItem: {}
}

export const repeatControls: MetaView<any[]> = (v, $): ViewResult => {
  [v, $] = $args(v, $)
  return html`
    <div>
      <button class="mq-button" @click=${up(addItem, v)}>${getDynamicTerm("addLabel")(v)}</button>
    </div>
  `
}

export const addItem = <T>(arr: T[]) => {
  const newItem = getDynamicTerm("newItem")(arr, m$(arr))
  arr.push(newItem)
}
