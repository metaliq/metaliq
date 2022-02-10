import { html, LitElement, PropertyValues } from "lit"
import { styleMap } from "lit/directives/style-map.js"
import { customElement, state, property } from "lit/decorators.js"
import { MetaView } from "./presentation"
import { up } from "@metaliq/up"

@customElement("mq-animated-hide-show")
export class AnimatedHideShow extends LitElement {
  @property({ type: Boolean })
  mqhidden = false // DON'T use `hidden` - it is a built-in HTML property that triggers display: none

  @state()
  private changing = false

  @state()
  private height = "auto"

  setHeight () {
    this.height = `${(Array.from(this.children)).reduce((t, e) => t + e.clientHeight, 0)}px`
  }

  shouldUpdate (changedProperties: PropertyValues<any>) {
    if (changedProperties.has("mqhidden")) {
      this.changing = true
      if (this.mqhidden) {
        this.setHeight()
      } else {
        this.height = "0"
        this.dispatchEvent(new CustomEvent("show", { bubbles: false }))
      }
      setTimeout(() => {
        if (!this.mqhidden) {
          this.setHeight()
        } else {
          this.height = "0"
        }
        setTimeout(() => {
          this.height = "auto"
          this.changing = false
          if (this.mqhidden) {
            this.dispatchEvent(new CustomEvent("hide", { bubbles: false }))
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
        <slot></slot>
      </div>
    `
  }
}

export const animatedHideShow = <T> (view: MetaView<T>): MetaView<T> => meta => {
  const hidden = (<Function>meta.$.spec.hidden)(meta)
  return html`
    <mq-animated-hide-show ?mqhidden=${hidden} 
      @show=${up(() => {
        meta.$.state.showing = true
      })}
      @hide=${up(() => {
        meta.$.state.showing = false
      })}
    >
      ${meta.$.state.showing ? view(meta) : ""}
    </mq-animated-hide-show>
  `
}