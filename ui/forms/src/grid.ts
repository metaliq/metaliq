import { fields, MetaView, MetaViewResolver, MetaViewTerm, repeat, span, tag, TagOptions } from "@metaliq/presentation"

export const grid = <T, P = any>(
  config: string | TagOptions<T, P>,
  headers: MetaViewTerm<T, P>,
  rows?: MetaViewTerm<T extends Array<infer I> ? I : never, T>
): MetaView<T, P> =>
    tag([`.mq-grid.mq-cols-${Array.isArray(headers) ? headers.length : 1}`, config], [
      tag(".mq-grid-header", Array.isArray(headers) ? headers.map(text) : text(headers)),
      repeat(tag(".mq-grid-row", rows ?? fields({ resolver: spanResolver })))
    ])

const text = (body: MetaViewTerm<any>) =>
  typeof body === "string" ? tag("span", body) : body

/**
 * A default view resolver for the value of the field in a span.
 */
export const spanResolver: MetaViewResolver = $ => $.model.view || span

export const spanFields = <T = any, P = any>() => fields<T, P>({ resolver: spanResolver })
