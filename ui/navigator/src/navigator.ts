import { Meta$, MetaFn } from "metaliq"
import { html } from "lit"
import { ifDefined } from "lit/directives/if-defined.js"
import { classMap } from "lit/directives/class-map.js"
import { getNavSelection, goNavRoute, toggleMenu } from "@metaliq/navigation"
import { MetaView, MetaViewTerm, MetaViewWrapper } from "@metaliq/presentation"
import { VALIDATION } from "@metaliq/validation"
import { TERMINOLOGY } from "@metaliq/terminology"
import { APPLICATION } from "@metaliq/application"

VALIDATION()
TERMINOLOGY()
APPLICATION()

export type NavigationOptions = {
  /**
   * Allows complete customisation of the header section,
   * replacing the standard menu / logo content.
   * If you want to maintain that and add to it,
   * create a header that in turn includes
   * `defaultNavHeaderContent` from this module,
   * then add your custom content.
   */
  header?: MetaViewTerm<any>

  /**
   * URL used for the logo picture in the default nav header.
   */
  logoUrl?: string

  /**
   * Click event for the default nav header logo.
   */
  logoUpdate?: MetaFn<any>

  /**
   * A wrapper for all page content.
   */
  pageWrapper?: MetaViewWrapper<any>
}

const hasOwnView: MetaFn<any> = $ => !!$.raw("view")

export const navigator = (options: NavigationOptions = {}): MetaView<any> => $ => {
  const selected$ = getNavSelection($, { mustHave: hasOwnView })
  const pageBody = selected$?.view(null, {
    resolver: false,
    noHide: true
  })
  return html`
    <div class="mq-navigator">
      ${options.header
        ? $.view(options.header)
        : html`
          <header>
            ${$.view(defaultNavHeaderContent(options))}
          </header>
        `
      }
      <nav class=${classMap({ "mq-show": $.state.nav?.showMenu })}>
        ${menuItems($)}
      </nav>
    </div>
    <div class="mq-article">
      ${options.pageWrapper ? $.view(options.pageWrapper(pageBody)) : pageBody}
    </div>
  `
}

export const defaultNavHeaderContent = (options: NavigationOptions = {}): MetaView<any> => $ => html`
  ${options.logoUrl ? html`
    <img src=${options.logoUrl} alt="Logo" @click=${$.up(options.logoUpdate)}>
  ` : ""}
  <i class="bi bi-list" @click=${$.up(toggleMenu)}></i>
`

// Test whether a part of the navigation structure contains a route itself or at any descendant level
const containsRoute = ($: Meta$<any>): boolean =>
  !!($.term("route") || $.fieldKeys().some(k => containsRoute($.$(k))))

const menuItems = ($: Meta$<any>, level: number = 0) => {
  const keys = ($.fieldKeys() || [])
    .filter(key => {
      const item$ = $.$(key)
      return !item$.term("offMenu") &&
        (item$.term("label") || item$.term("symbol")) &&
        containsRoute(item$)
    })
  if (keys.length) {
    const selectedChild$ = getNavSelection($, { recurse: false })
    const selectedLeaf$ = getNavSelection($, { recurse: true })
    return html`
      <ul class=${`mq-level-${level}`}>
        ${keys.map(key => {
          const child$ = $.$(key)
          const isSelected = selectedChild$ === child$ // Anywhere in the selection chain
          const isSelectedItem = selectedLeaf$ === child$ // The specifically selected item
          return child$.view(menuItem(isSelected, isSelectedItem, level))
        })}
      </ul>
    `
  } else return ""
}

const menuItem = (
  isSelected: boolean, isSelectedItem: boolean, level: number = 1
): MetaView<any> => navItem$ => {
  const text = navItem$.term("labelView") ?? navItem$.term("label")
  const icon = navItem$.term("symbol")
  return html`
    <li @click=${(evt: Event) => menuItemClick(isSelected)(navItem$, evt)} class=${classMap({
      "mq-nav-selected": isSelected,
      "mq-nav-selected-item": isSelectedItem,
      "mq-nav-no-icon": !icon
    })}>
      ${icon
        ? html`<i class=${ifDefined(icon)}>`
        : navItem$.model.controlView
          ? navItem$.view(navItem$.term("controlView"))
          : html`<div></div>`
      }
      ${text ? html`<span>${text}</span>` : ""}
      ${navItem$.state?.nav?.expandMenu ? menuItems(navItem$, level + 1) : ""}
    </li>
  `
}

const menuItemClick = (isSelected: boolean): MetaFn<any> => ($, event) => {
  // If currently selected leaf has a different parent with the new selection, close menu expansions
  goNavRoute($, event)
}
