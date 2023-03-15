import { html, LitElement, PropertyValues } from "lit"
import { styleMap } from "lit/directives/style-map.js"
import { customElement, property, state } from "lit/decorators.js"
import { MetaView, setViewWrapper } from "@metaliq/presentation"

@customElement("mq-animated-hide-show")
export class AnimatedHideShow extends LitElement {
  @property({ type: Boolean })
  mqHidden = false // DON'T use `hidden` - it is a built-in HTML property that triggers display: none

  @state()
  private changing = false

  @state()
  private height = "auto"

  @state()
  private showing = false

  setHeight () {
    this.height = `${(Array.from(this.children)).reduce((t, e) => t + e.clientHeight, 0)}px`
  }

  shouldUpdate (changedProperties: PropertyValues<any>) {
    if (changedProperties.has("mqHidden")) {
      this.changing = true
      if (this.mqHidden) {
        this.setHeight()
      } else {
        this.height = "0"
        this.showing = true
      }
      setTimeout(() => {
        if (!this.mqHidden) {
          this.setHeight()
        } else {
          this.height = "0"
        }
        setTimeout(() => {
          this.height = "auto"
          this.changing = false
          if (this.mqHidden) {
            this.showing = false
          }
        }, 325)
      }, 10)
    }
    return true
  }

  render () {
    return html`
      <div style=${styleMap({
        transition: "height 0.3s ease-in-out",
        height: this.height,
        overflowY: this.changing ? "hidden" : "visible"
      })}>
        ${this.showing ? html`<slot></slot>` : ""}
      </div>
    `
  }
}

/**
 * A ViewWrapper using the mq-animated-hide-show custom element.
 */
export const animatedHideShow = <T> (metaView: MetaView<T>): MetaView<T> => (value, $) => {
  if (typeof $.model.hidden === "function") {
    const hidden = !!$.my("hidden")
    return html`
      <mq-animated-hide-show ?mqHidden=${hidden}>
        ${metaView(value, $)}
      </mq-animated-hide-show>
    `
  } else {
    return metaView(value, $)
  }
}

setViewWrapper(animatedHideShow)
