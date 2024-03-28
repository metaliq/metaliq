import { html, literal } from "lit/static-html.js"
import { ContainerMetaView, MetaView, MetaViewTerm } from "./presentation"
import { nothing } from "lit"
import { isMetaFn, MetaFn } from "metaliq"

/**
 * Options to support additional functionality, e.g. click handling.
 */
export type TagOptions<T, P = any> = {
  tagName?: string
  id?: string
  classes?: string | string[] | MetaFn<T, P, string[]>
  onClick?: MetaFn<T, P>
}

/**
 * Optional tag configuration is either a TagOptions object
 * or a string which can be parsed to one using the following method.
 *
 * Tags can be configured with a string which has the following parts:
 * <tagName>#<id>.<class1>.<class2>
 * The tag name is optional and if omitted the value `div` is used.
 * The id is optional and if omitted no ID will be assigned to the tag.
 * One or more class names may be assigned, if none are present there will be no class attribute.
 */
export type TagConfig<T, P = any> = string | TagOptions<T, P> // Leave scope for extended object tag config in future

export const parseTagConfig = (config: TagConfig<any>) => {
  if (typeof config === "string") {
    const tagName = config?.match(/^([_a-zA-Z0-9-]*)/)?.[1]
    const id = config?.match(/#([_a-zA-Z0-9-]*)/)?.[1]
    const classes = config?.match(/\.[:_a-zA-Z0-9-]*/g)?.map(c => c.slice(1))?.join(" ")
    config = {
      ...tagName && { tagName },
      ...id && { id },
      ...classes && { classes }
    }
  }
  if (typeof config.classes === "string") config.classes = config.classes.split(" ")
  config.classes ||= []
  return config
}

export const tag = <T = any, P = any>(
  config1: TagConfig<T, P> = "", config2: TagConfig<T, P> = ""
) => (body: MetaViewTerm<T, P> = ""): MetaView<T, P> => (v, $) => {
    // Compose options object from defaults and params, parsing string format
    const parsed1 = parseTagConfig(config1)
    const parsed2 = parseTagConfig(config2)

    const options: TagOptions<T, P> = {
      ...{ tagName: "div" },
      ...parsed1,
      ...parsed2
    }
    const classes1 = (typeof parsed1.classes === "function"
      ? $.fn(parsed1.classes) : parsed1.classes) as string[]
    const classes2 = (typeof parsed2.classes === "function"
      ? $.fn(parsed2.classes) : parsed2.classes) as string[]

    options.classes = Array.from(new Set([...classes1, ...classes2])).join(" ")

    // Obtain tag name lit
    const tagLiteral = tagLiterals[options.tagName as keyof typeof tagLiterals]
    if (!tagLiteral) {
      console.error(`Unrecognised tag name configuration: ${options.tagName}`)
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

export const tags = <T = any, P = any>(
  config1: TagConfig<T, P> = "", config2: TagConfig<T, P> = ""
) => (body: MetaViewTerm<T, P> = ""): Array<MetaView<T, P>> => {
    const configured = tag(config1, config2)
    if (Array.isArray(body)) {
      return body.map(b => configured(b as MetaViewTerm<T, P>))
    } else {
      return [configured(body)]
    }
  }

/**
 * Convenience function for passing type information to configurable containers in views.
 *
 * Note that you still don't get type information on the container config.
 *
 * To get full typing, explicity type the configurable container, like:
 * ```
 *  tag<MyType>(myTypeSpecificTagConfig)(myTypeSpecificTagBody)
 * ```
 *
 * However, a common case is to use tags with generic config and specific content,
 * and it gets frustrating to keep having to provide these.
 * You can choose to use `t` instead.
 * ```
 *  t(tag(".my-class")(v => v.propertyWillBeTypeChecked))
 * ```
 *
 * @experimental
 */
export const t = <T, P>(
  container: ContainerMetaView<any, any>,
  body: MetaViewTerm<T, P>
): MetaView<T, P> => container(body)

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
  dl: literal`dl`,
  dd: literal`dd`,
  dt: literal`dt`,
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
  tfoot: literal`tfoot`,
  tr: literal`tr`,
  td: literal`td`
}

/**
 * An example of a super-simple tag to display a field value in a span.
 */
export const span = tag<any>("span")(v => v.toString())
