import { initMetaState, Meta } from "../../meta"

export interface CommunicationSpec<T, P> {
  /**
   * An array of channels that will be registered for communicating with the produced meta.
   * If registered, any call to `sendMeta` specifying this channel will be routed to this meta.
   * Designed primarily for use by singleton receivers (e.g. message logging or display).
   * Multicasting would need to be handled internally within the data payload, e.g. by ID.
   */
  channels: Array<Channel<any, T, P>>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends CommunicationSpec<T, P> {}
  }
}

export type Channel<M, R, T, P = any> = (meta: Meta<T, P>) => ChannelHandler<M, R>
type ChannelHandler<M, R> = (message: M) => R

type CommunicationPolicy = {
  channelMap: Map<ChannelHandler<any, any>, Meta<any>>
}
const policy: CommunicationPolicy = { channelMap: new Map() }

initMetaState(meta => {
  for (const channel of meta.$.spec.channels || []) {
    policy.channelMap.set(channel, meta)
  }
  return {}
})

/**
 * Make a channel call.
 * If the channel is registered the message will be sent along with the
 */
export function call<M, R> (channel: Channel<M, R, any>, message: M) {
  const meta = policy.channelMap.get(channel)
  if (meta) return channel(meta)(message)
}
