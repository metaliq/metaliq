import { html, literal } from "lit/static-html.js"
import { MetaView, MetaViewTerm, ViewResult } from "./presentation"
import { nothing } from "lit"
import { isMetaFn, MetaFn } from "metaliq"

/**
 * Options to support additional functionality, e.g. click handling.
 */
export type TagOptions<T, P = any> = {
  tagName?: string
  id?: string
  classes?: string
  onClick?: MetaFn<T, P>
}

/**
 * Tags can be configured with a string which has the following parts:
 * <tagName>#<id>.<class1>.<class2>
 * The tag name is optional and if omitted the value `div` is used.
 * The id is optional and if omitted no ID will be assigned to the tag.
 * One or more class names may be assigned, if none are present there will be no class attribute.
 */
export type TagConfig<T, P = any> = string | TagOptions<T, P> // Leave scope for extended object tag config in future

export const tag = <T = any, P = any>(config1: TagConfig<T, P> = "", config2: TagConfig<T, P> = "") =>
  <T = any, P = any>(body: MetaViewTerm<T, P> = ""): MetaView<T, P> => (v, $) => {
    const parseConfig = (config: TagConfig<any>) =>
      (typeof config === "string") ? {
        tagName: config?.match(/^([_a-zA-Z0-9-]*)/)?.[1],
        id: config?.match(/#([_a-zA-Z0-9-]*)/)?.[1],
        classes: config?.match(/\.[:_a-zA-Z0-9-]*/g)?.map(c => c.slice(1))?.join(" ")
      } : config

    // Compose options object from defaults and params, parsing string format
    const options: TagOptions<T, P> = {
      ...parseConfig(config1),
      // ...parseConfig(config2)
    }
    options.tagName ||= "div"

    // Obtain tag name lit
    const tagLiteral = tagLiterals[options.tagName as keyof typeof tagLiterals]
    if (!tagLiteral) {
      console.warn(`Unregistered tag literal: ${options.tagName}`)
      return
    }

    const onClick = isMetaFn(options.onClick) ? $.up(options.onClick) : nothing

    return html`
      <${tagLiteral} 
        id=${options.id || nothing} 
        class=${options.classes || nothing} 
        @click=${onClick}
      >
        ${$.view(body)}
      </${tagLiteral}>
    `
  }

export const tags = <T = any, P = any>(config1: TagConfig<T, P> = "", config2: TagConfig<T, P> = "") =>
  <T = any, P = any>(
    body: MetaViewTerm<T, P> = "", options: TagOptions<T, P> = {}
  ): Array<MetaView<T, P>> => {
    const configured = tag(config1, config2)
    if (Array.isArray(body)) {
      return body.map(b => configured(b))
    } else {
      return [configured(body)]
    }
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
