import { View } from "./presentation"
import { html, LitElement } from "lit"
import { Fn } from "../../meta"
import { customElement, state } from "lit/decorators.js"

@customElement("mq-expander")
export class Expander extends LitElement {
  @state()
  private _height = 0

  private observer: MutationObserver

  handleSlotChange (e: Event) {
    const slot = e.target as HTMLSlotElement

    const setHeight = () => {
      this._height = slot.assignedElements().reduce((t: number, e: Element) => t + e.clientHeight, 0)
      console.log(`Changed slot, new height ${this._height}`)
    }

    setHeight()

    if (this.observer) this.observer.disconnect()

    const elements = slot.assignedElements()

    if (elements.length) {
      this.observer = new MutationObserver(setHeight)
      for (const element of elements) {
        this.observer.observe(element, {
          attributes: true,
          childList: true,
          subtree: true
        })
      }
    }
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    if (this.observer) this.observer.disconnect()
  }

  render () {
    return html`
      <div style="height: ${this._height}px; transition: height 0.3s ease-in-out; overflow-y: hidden;">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
    `
  }
}

export const expander = <T> (expandedFn: Fn<T, boolean>) => (content: View<T>) => (data: T) => html`
  <mq-expander>
    ${expandedFn(data) ? content(data) : ""}
  </mq-expander>
`
