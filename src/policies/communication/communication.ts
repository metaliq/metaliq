import { initMetaState, Meta, MetaMorph } from "../../meta"

export interface CommunicationSpec<T, P> {
  /**
   * An array of channels that will be registered for communicating with the produced meta.
   * If registered, any call to this channel will be applied to this meta.
   * Designed primarily for use by singleton receivers (e.g. message logging or display).
   * Multicasting would need to be handled internally within the data payload, e.g. by ID.
   */
  channels?: Array<MetaMorph<T, P>>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends CommunicationSpec<T, P> {}
  }
}

/**
 * Internal policy register.
 */
type CommunicationPolicy = {
  channelMap: Map<MetaMorph<any>, Meta<any>>
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
export function call<T, P, M, R> (morph: MetaMorph<T, P, M, R>, message: M) {
  const meta = policy.channelMap.get(morph) as Meta<T, P>
  if (meta) return morph(meta, message)
}
