import { fields, MetaView, MetaViewResolver, MetaViewTerm, repeat, span, tag, TagOptions, tags } from "@metaliq/presentation"

export type GridOptions<T, P = any> = TagOptions<T, P> & {
  headers: MetaViewTerm<T, P>,
  rows: MetaViewTerm<T, P>
}

export const grid = <T, P = any>(
  config: string | GridOptions<T, P>,
  headers: MetaViewTerm<T, P>,
  rows?: MetaViewTerm<T extends Array<infer I> ? I : never, T>
): MetaView<T, P> =>
    tag(`.mq-grid.mq-cols-${Array.isArray(headers) ? headers.length : 1}`, config)([
      ...tags(".mq-grid-header")(headers),
      repeat<T, any>(rows ?? fields({ resolver: spanResolver }))
    ])

/**
 * A default view resolver for the value of the field in a span.
 */
const spanResolver: MetaViewResolver<any> = (v, $) => $.model.view || span

export const gridHeaders = tags(".mq-grid-header")
