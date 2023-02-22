import { child$, fieldKeys, getAncestorTerm, Meta$, reset } from "metaliq"
import { html } from "lit"
import { classMap } from "lit/directives/class-map.js"

import { getNavSelection, goNavRoute, toggleMenu } from "@metaliq/navigation"
import { MetaView, view, ViewResult } from "@metaliq/presentation"
import { up, Update } from "@metaliq/up"

export type NavigationOptions = {
  logoUrl?: string
  logoUpdate?: Update<any>
}

export const navigator = (options: NavigationOptions): MetaView<any> => (v, $) => html`
  <div class="mq-article">
    ${getView(getNavSelection($))}
  </div>
  <header>
    <div class="header-content">
      <img src=${options.logoUrl} alt="Logo" @click=${up(options.logoUpdate, v)}>
      <i class="bi bi-list" @click=${up(toggleMenu, $)}></i>
      <nav class=${classMap({ "mq-show": $.state.nav.showMenu })}>
        ${menuItems($)}
      </nav>
    </div>
  </header>
`

const menuItems = ($: Meta$<any>, level: number = 0) => {
  const keys = fieldKeys($?.model)
    .filter(key => {
      const { model, state } = child$($, key)
      return model.route && !state.hidden && (state.label || state.symbol)
    })
  return keys?.length ? html`
    <ul class=${`mq-level-${level}`}>
      ${keys.map(key => menuItem(child$($, key), getNavSelection($), level))}
    </ul>
  ` : ""
}

const menuItem = (navItem$: Meta$<any>, selected$: Meta$<any>, level: number = 1): ViewResult => {
  const text = navItem$.state.label
  const icon = navItem$.state.symbol
  return html`
    <li @click=${up(goNavRoute, navItem$)} class=${classMap({
      "mq-selected": navItem$ === selected$
    })}>
      ${icon ? html`<i class=${icon}>` : ""}
      ${text ? html`<span>${text}</span>` : ""}
      ${menuItems(navItem$, level + 1)}
    </li>
  `
}

const getView = (navItem$: Meta$<any>) => {
  reset(navItem$)
  const viewTerm = getAncestorTerm("view")(navItem$.value, navItem$)
  if (viewTerm) {
    return view(viewTerm)(navItem$.value, navItem$)
  } else {
    console.error(`No view found for Navigation Item: ${navItem$.state.label}`)
  }
}
