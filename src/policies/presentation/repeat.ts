import { MetaView } from "./presentation"
import { html } from "lit"
import { MetaArray, metafy } from "../../meta"
import { up } from "@metaliq/up"

export type RepeatControlOptions<T> = {
  addLabel?: string
  removeLabel?: string
  newItem?: T
}

export const defaultRepeatOptions: RepeatControlOptions<any> = {
  addLabel: "Add Item",
  removeLabel: "Remove Item",
  newItem: {}
}

export const repeatControls = <T>(options: RepeatControlOptions<T> = {}): MetaView<T[]> => meta => {
  const mergedOptions: RepeatControlOptions<any> = { ...defaultRepeatOptions, ...options }
  const metaArr = <unknown>meta as MetaArray<any>
  return html`
    <div>
      <button class="mq-button" @click=${up(addItem(mergedOptions), metaArr)}>${options.addLabel}</button>
    </div>
  `
}

export const addItem = <T>(options: RepeatControlOptions<T>) => (arr: MetaArray<T>) => {
  const newMeta = metafy(arr.$.spec.items, options.newItem, arr.$.parent, arr.$.key)
  arr.push(newMeta)
}
