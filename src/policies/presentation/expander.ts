import { MetaView, View } from "./presentation"
import { html, LitElement } from "lit"
import { metaCall } from "../../meta"
import { customElement, property, state } from "lit/decorators.js"

@customElement("mq-expander")
export class Expander extends LitElement {
  @state()
  private height = 0

  @state()
  private overflow = "hidden"

  @property({ reflect: true })
  lastUpdated = new Date().getTime().toString()

  private observer: MutationObserver

  handleSlotChange (e: Event) {
    const slot = e.target as HTMLSlotElement

    const setHeight = () => {
      this.overflow = "hidden"
      this.height = slot.assignedElements().reduce((t: number, e: Element) => t + e.clientHeight, 0)
      setTimeout(() => {
        this.lastUpdated = new Date().getTime().toString()
        this.overflow = "visible"
      }, 325) // Delay to trigger mutation observer of any parent expander _after_ this one is complete.
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
      <div style="height: ${this.height}px; transition: height 0.3s ease-in-out; overflow-y: ${this.overflow};">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
    `
  }
}

export const expander = <T> (expandedFn: MetaView<T, any, boolean>) => (content: View<T>) => (data: T) => html`
  <mq-expander>
    ${metaCall(expandedFn)(data) ? content(data) : ""}
  </mq-expander>
`
