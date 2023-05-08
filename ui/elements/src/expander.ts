import { MetaView } from "@metaliq/presentation"
import { html, LitElement } from "lit"
import { MetaFn } from "metaliq"
import { customElement, property, state } from "lit/decorators.js"

@customElement("mq-expander")
export class Expander extends LitElement {
  /**
   * Transition duration in milliseconds.
   */
  @property({ type: Number })
  public mqDuration = 300

  @state()
  private _mqHeight = 0

  @state()
  private _mqOverflow = "hidden"

  @property({ reflect: true })
    lastUpdated = new Date().getTime().toString()

  private observer: MutationObserver

  handleSlotChange (e: Event) {
    const slot = e.target as HTMLSlotElement

    const setHeight = () => {
      this._mqOverflow = "hidden"
      this._mqHeight = slot.assignedElements().reduce((t: number, e: Element) => t + e.clientHeight, 0)
      setTimeout(() => {
        this.lastUpdated = new Date().getTime().toString()
        this._mqOverflow = "visible"
      }, this.mqDuration + 25) // Delay to trigger mutation observer of any parent expander _after_ this one is complete.
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
    const pixels = `${this._mqHeight}px`
    const seconds = `${this.mqDuration / 1000}s`
    return html`
      <div style="height: ${pixels}; transition: height ${seconds} ease-in-out; overflow-y: ${this._mqOverflow};">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
    `
  }
}

export type ExpanderOptions<T, P = any> = {
  expanded: MetaFn<T, P>
}

export const expander = <T, P = any> ({ expanded }: ExpanderOptions<T, P>) => (view: MetaView<T, P>): MetaView<T, P> => (v, $) => html`
  <mq-expander>
    ${expanded(v, $) ? view(v, $) : ""}
  </mq-expander>
`
