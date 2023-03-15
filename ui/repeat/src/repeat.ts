import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { $args, MetaFn } from "metaliq"

export interface RepeatConfig<T, P = any> {
  addLabel?: string | MetaFn<T, P, string>
  newItem?: T extends Array<infer I> ? I | MetaFn<T, P, I> : T
}

export const defaultRepeatConfig: RepeatConfig<any> = {
  addLabel: "Add Item",
  newItem: {}
}

export const repeatControls = (config: RepeatConfig<any>): MetaView<any[]> => (v, $) => {
  [v, $] = $args(v, $)
  config = { ...defaultRepeatConfig, ...config }
  return html`
    <div>
      <button class="mq-button" @click=${$.up(addItem(config))}>${$.fn(config.addLabel)}</button>
    </div>
  `
}

export const addItem = <T extends any[], P>(config: RepeatConfig<T, P>): MetaFn<T, P> => (v, $) => {
  const newItem = $.fn(config.newItem)
  newItem && $.value.push(newItem)
}
