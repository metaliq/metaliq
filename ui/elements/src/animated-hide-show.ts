import { html, LitElement, PropertyValues } from "lit"
import { styleMap } from "lit/directives/style-map.js"
import { customElement, property, state } from "lit/decorators.js"
import { ViewWrapper } from "@metaliq/presentation"
import { VALIDATION } from "@metaliq/validation"

VALIDATION()

@customElement("mq-animated-hide-show")
export class AnimatedHideShow extends LitElement {
  /**
   * Should the contents be shown or hidden?
   */
  @property({ type: Boolean })
  public mqHidden = false // DON'T use `hidden` - it is a built-in HTML property that triggers display: none

  /**
   * Transition duration in milliseconds.
   */
  @property({ type: Number })
  public mqDuration = 300

  @state()
  private _mqChanging = false

  @state()
  private _mqHeight = "auto"

  @state()
  private _mqShowing = false

  setHeight () {
    // TODO: Why is this eslint exception needed, both operands are of type number.
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    this._mqHeight = `${(Array.from(this.children)).reduce((t, e) => t + e.clientHeight, 0)}px`
  }

  shouldUpdate (changedProperties: PropertyValues<any>) {
    if (changedProperties.has("mqHidden")) {
      this._mqChanging = true
      if (this.mqHidden) {
        this.setHeight()
      } else {
        this._mqHeight = "0"
        this._mqShowing = true
      }
      setTimeout(() => {
        if (!this.mqHidden) {
          this.setHeight()
        } else {
          this._mqHeight = "0"
        }
        setTimeout(() => {
          this._mqHeight = "auto"
          this._mqChanging = false
          if (this.mqHidden) {
            this._mqShowing = false
          }
        }, this.mqDuration + 25)
      }, 10)
    }
    return true
  }

  render () {
    const seconds = `${this.mqDuration / 1000}s`
    return html`
      <div style=${styleMap({
        transition: `height ${seconds} ease-in-out`,
        height: this._mqHeight,
        overflowY: this._mqChanging ? "hidden" : "visible"
      })}>
        ${this._mqShowing ? html`<slot></slot>` : ""}
      </div>
    `
  }
}

export type AnimatedHideShowOptions = {
  duration?: number
}

/**
 * Wrap a MetaView with the mq-animated-hide-show custom element and link its `mq-hidden`
 * property with the hidden term from the MetaModel.
 */
export const animatedHideShow = <T = any, P = any>({ duration }: AnimatedHideShowOptions = {}): ViewWrapper<T, P> => (view) => (v, $) => html`
  <mq-animated-hide-show ?mqHidden=${!!$.term("hidden")} ?mqDuration=${duration}>
    ${$.view(view)}
  </mq-animated-hide-show>
`
