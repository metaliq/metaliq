import { html, literal } from "lit/static-html.js"
import { CssClass, MetaView, MetaViewTerm } from "./presentation"
import { nothing } from "lit"
import { isMetaFn, MaybeFn, MetaFn } from "metaliq"

/**
 * Options to support additional functionality, e.g. click handling.
 */
export type TagOptions<T, P = any> = {
  name?: string
  id?: string
  classes?: MaybeFn<T, P, CssClass[]>
  onClick?: MetaFn<T, P>
  title?: string
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
    const name = config?.match(/^([_a-zA-Z0-9-]*)/)?.[1]
    const id = config?.match(/#([_a-zA-Z0-9-]*)/)?.[1]
    const classes = config?.match(/\.[:_a-zA-Z0-9-]*/g)?.map(c => c.slice(1))
    config = {
      ...name && { name },
      ...id && { id },
      ...classes && { classes }
    }
  }
  return config
}

/**
 * A general purpose container metaview for a HTML tag
 * with configurable type, classes and other attributes
 * as well as optional body content.
 */
export const tag = <T = any, P = any>(
  config1: TagConfig<T, P> | Array<TagConfig<T, P>> = "",
  body: MetaViewTerm<T, P> = ""
): MetaView<T, P> =>
    tagFactory(config1)(body)

/**
 * Create multiple tags with the same configuration.
 * Would normally be passed a MetaViewTerm that is an array,
 * each individual term will be wrapped in a separate tag
 * with the common configuration.
 */
export const tags = <T = any, P = any>(
  config: TagConfig<T, P> | Array<TagConfig<T, P>> = "",
  body: MetaViewTerm<T, P> = ""
): Array<MetaView<T, P>> => {
  const configured = tagFactory(config)
  if (Array.isArray(body)) {
    return body.map(b => configured(b as MetaViewTerm<T, P>))
  } else {
    return [configured(body)]
  }
}

/**
 * The core tag creation function is curried for efficiency
 * when multiple tags share the same config, such as `tags`.
 */
export const tagFactory = <T = any, P = any>(
  config: TagConfig<T, P> | Array<TagConfig<T, P>> = ""
) => (body: MetaViewTerm<T, P> = ""): MetaView<T, P> => $ => {
    // Merge options parameter into a single TagOptions
    const configArray = Array.isArray(config) ? config : [config]
    let mergedOptions: TagOptions<T, P> = {}
    const allClasses: string[] = []
    for (const eachConf of configArray) {
      const eachOptions = parseTagConfig(eachConf)
      allClasses.push(...$.maybeFn(eachOptions.classes) || "")
      mergedOptions = { ...mergedOptions, ...eachOptions }
    }

    const options: TagOptions<T, P> = {
      ...{ name: "div" },
      ...mergedOptions,
      ...{ classes: allClasses.filter(Boolean) }
    }

    // Obtain tag name lit
    const tagLiteral = tagLiterals[options.name as keyof typeof tagLiterals]
    if (!tagLiteral) {
      console.error(`Unrecognised tag name configuration: ${options.name}`)
      return
    }

    const onClick = isMetaFn(options.onClick) ? $.up(options.onClick) : nothing
    const classes = options.classes as CssClass[]

    return html`
      <${tagLiteral} 
        id=${options.id || nothing} 
        class=${classes.join(" ") || nothing}
        @click=${onClick || nothing}
        title=${options.title || nothing}
      >
        ${$.view(body)}
      </${tagLiteral}>
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
  td: literal`td`,
  a: literal`a`,
  button: literal`button`
}

/**
 * An example of a super-simple tag to display a field value in a span.
 */
export const span = tagFactory("span")($ => ($.value ?? "").toString())
