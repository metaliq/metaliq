import { ConfigurableMetaFn, Meta$, MetaFn, MetaModel, metaSetups } from "metaliq"

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
  if ($) return channel(config)($)
}

/**
 * This interface should be extended by some shared value provider.
 */
export interface Shared {
  // Prevent error on empty interface
  this?: Shared
}

/**
 * A useful channel for implementing a shared value store.
 */
export const getSharedValueChannel = <K extends keyof Shared>(
  key: K
): MetaFn<Shared, any, Shared[K]> => $ => {
    return $.$(key).value
  }

export const getShared: <K extends keyof Shared>(key?: K) => Shared[K] = call(getSharedValueChannel)

/**
 * A useful base model for a shared values store.
 */
export const sharedValuesModel: MetaModel<Shared> = {
  channels: [
    getSharedValueChannel
  ]
}
