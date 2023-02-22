import { Meta$, MetaFn, metaSetups } from "metaliq"

export interface CommunicationTerms<T, P> {
  /**
   * An array of channels that will be registered for communicating with the produced meta.
   * If registered, any call to this channel will be applied to this meta.
   * Designed primarily for use by singleton receivers (e.g. message logging or display).
   * Multicasting would need to be handled internally within the data payload, e.g. by ID.
   */
  channels?: Array<MetaFn<T, P>>
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
  channelMap: Map<MetaFn<any>, Meta$<any>>
}
const policy: CommunicationPolicy = { channelMap: new Map() }

metaSetups.push($ => {
  for (const channel of $.model.channels || []) {
    policy.channelMap.set(channel, $)
  }
})

export type ChannelCall<M> = (msg: M) => any

/**
 * Make a channel call.
 * If the channel is registered the message will be delivered to it.
 * This is a curried function, so that it is easy to:
 * (a) Create a partially applied function that will call the channel and
 * (b) Use call (either directly or via partial application) from `up`.
 */
export const call = <T, P, M> (channel: MetaFn<T, P, ChannelCall<M>>) => (msg?: M) => {
  const $ = policy.channelMap.get(channel)
  if ($) return channel($.value, $)(msg)
}
