import { ConfigurableMetaFn, FieldKey, Meta$, MetaFn, metaSetups } from "metaliq"

/**
 * Policy registration.
 */
export const COMMUNICATION = () => {}

export interface CommunicationTerms<T, P> {
  /**
   * An array of channels that will be registered for communicating with the produced meta.
   * If registered, any call to this channel will be applied to this meta.
   * Designed primarily for use by singleton receivers (e.g. message logging/display, centralised lookup tables).
   * Multicasting would need to be handled internally within the data payload, e.g. by ID.
   */
  channels?: Array<ConfigurableMetaFn<any, T, P>>
}

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends CommunicationTerms<T, P> {}
  }
}

/**
 * Internal policy register.
 */
type CommunicationPolicy = {
  channelMap: Map<ConfigurableMetaFn<any>, Meta$<any>>
}
const policy: CommunicationPolicy = { channelMap: new Map() }

metaSetups.push($ => {
  for (const channel of $.model.channels || []) {
    policy.channelMap.set(channel, $)
  }
})

/**
 * Make a channel call.
 * If the channel (configurable MetaFn) has been registered in a model somewhere in the meta-graph
 * the config message will be passed into a function call on its associated meta value node.
 */
export const call = <C, T, P, R>(channel: ConfigurableMetaFn<C, P, T, R>) => (config: C = undefined): R => {
  const $ = policy.channelMap.get(channel)
  if ($) return $.fn(channel(config))
}

/**
 * A useful channel for implementing a shared value store.
 */
export const getValueChannel = <T, K extends FieldKey<T>>(key: K): MetaFn<T, any, T[K]> => (v, $) => {
  return $.child$(key).value
}

/**
 * Allows narrowing of types on an exported call to getValueChannel.
 */
export type GetValue<T> = <K extends FieldKey<T>>(config?: K) => T[K]
