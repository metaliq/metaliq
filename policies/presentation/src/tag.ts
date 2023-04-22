import { html, literal } from "lit/static-html.js"
import { MetaView, MetaViewTerm, SingularViewResult, ViewResult } from "./presentation"
import { nothing } from "lit"
import { isMetaFn, MetaFn } from "metaliq"

/**
 * Tags can be configured with a string which has the following parts:
 * <tagName>#<id>.<class1>.<class2>
 * The tag name is optional and if omitted the value `div` is used.
 * The id is optional and if omitted no ID will be assigned to the tag.
 * One or more class names may be assigned, if none are present there will be no class attribute.
 */
export type TagConfig = string // Leave scope for extended object tag config in future

/**
 * The body of a tag is either a static view result,
 * a meta view term, which is a single meta view or an
 * array of meta views.
 */
export type TagBody<T, P = any> = MetaViewTerm<T, P> | SingularViewResult

/**
 * Options to support additional functionality, e.g. click handling.
 */
export type TagOptions<T, P = any> = {
  onClick?: MetaFn<T, P>
}

export const tag = <T, P = any>(
  config: TagConfig, body: TagBody<T, P> = "", options: TagOptions<T, P> = {}
): MetaView<T, P> => (v, $) => {
    const tagName = config?.match(/^([_a-zA-Z0-9-]*)/)?.[1] || "div"
    const tagLiteral = tagLiterals[tagName as keyof typeof tagLiterals]
    if (!tagLiteral) {
      console.warn(`Unregistered tag literal: ${tagName}`)
      return
    }
    const id = config?.match(/#([_a-zA-Z0-9-]*)/)?.[1] || nothing
    const classes = config?.match(/\.[:_a-zA-Z0-9-]*/g)?.map(c => c.slice(1))?.join(" ") || nothing
    const isViewResult = (body: TagBody<T, P>): body is SingularViewResult =>
      typeof body === "string" || (typeof body === "object" && "strings" in body)
    let content: ViewResult
    if (isViewResult(body)) {
      content = body
    } else {
      content = $.view(body)
    }
    const onClick = isMetaFn(options.onClick) ? $.up(options.onClick) : nothing
    return html`
      <${tagLiteral} id=${id} class=${classes} @click=${onClick}>${content}</${tagLiteral}>
    `
  }

/**
 * A non-exhaustive map of standard HTML tag names to tag literals.
 *
 * Using an exported tag literal map avoids having to use `unsafeStatic`,
 * whilst still allowing the map to be extended by solution projects,
 * for example to add custom elements.
 */

export const tagLiterals = {
  div: literal`div`,
  p: literal`p`,
  span: literal`span`,
  nav: literal`nav`,
  section: literal`section`,
  header: literal`header`,
  article: literal`article`,
  footer: literal`footer`,
  ol: literal`ol`,
  ul: literal`ul`,
  li: literal`li`,
  i: literal`i`,
  b: literal`b`,
  em: literal`em`,
  strong: literal`strong`,
  small: literal`small`,
  sub: literal`sub`,
  sup: literal`sup`,
  h1: literal`h1`,
  h2: literal`h2`,
  h3: literal`h3`,
  h4: literal`h4`,
  h5: literal`h5`,
  h6: literal`h6`,
  table: literal`table`,
  tbody: literal`tbody`,
  thead: literal`thead`,
  tr: literal`tr`,
  td: literal`td`
}
