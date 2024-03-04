import { Meta$, MetaFn } from "metaliq"
import { html } from "lit"
import { ifDefined } from "lit/directives/if-defined.js"
import { classMap } from "lit/directives/class-map.js"
import { getNavSelection, goNavRoute, toggleMenu } from "@metaliq/navigation"
import { MetaView, ViewResult } from "@metaliq/presentation"
import { VALIDATION } from "@metaliq/validation"
import { TERMINOLOGY } from "@metaliq/terminology"
import { APPLICATION } from "@metaliq/application"

VALIDATION()
TERMINOLOGY()
APPLICATION()

export type NavigationOptions = {
  logoUrl?: string
  logoUpdate?: MetaFn<any>
}

const hasOwnView: MetaFn<any> = (v, $) => !!$.raw("view")

export const navigator = (options: NavigationOptions = {}): MetaView<any> => (v, $) => html`
  <header>
    <div class="header-content">
      ${options.logoUrl ? html`
        <img src=${options.logoUrl} alt="Logo" @click=${$.up(options.logoUpdate)}>
      ` : ""}
      <i class="bi bi-list" @click=${$.up(toggleMenu)}></i>
      <nav class=${classMap({ "mq-show": $.state.nav?.showMenu })}>
        ${menuItems($)}
      </nav>
    </div>
  </header>
  <div class="mq-article">
    ${getNavSelection($, { mustHave: hasOwnView })?.view(null, { noHide: true })}
  </div>
`

// Test whether a part of the navigation structure contains a route itself or at any descendant level
const containsRoute = ($: Meta$<any>): boolean =>
  !!($.term("route") || $.childKeys().some(k => containsRoute($.child$(k))))

const menuItems = ($: Meta$<any>, level: number = 0) => {
  const keys = ($.childKeys() || [])
    .filter(key => {
      const item$ = $.child$(key)
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
          const child$ = $.child$(key)
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
): MetaView<any> => (navItem, navItem$) => {
  const text = navItem$.term("labelView") ?? navItem$.term("label")
  const icon = navItem$.term("symbol")
  return html`
    <li @click=${(evt: Event) => navItem$.fn(goNavRoute, evt)} class=${classMap({
      "mq-nav-selected": isSelected,
      "mq-nav-selected-item": isSelectedItem
    })}>
      ${icon ? html`<i class=${ifDefined(icon)}>` : ""}
      ${text ? html`<span>${text}</span>` : ""}
      ${menuItems(navItem$, level + 1)}
    </li>
  `
}
