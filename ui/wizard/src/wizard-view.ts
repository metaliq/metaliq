import { html } from "lit"
import { classMap } from "lit/directives/class-map.js"
import { Meta, Meta$ } from "metaliq"

import { backwardsLabel, changeStep, forwardsLabel } from "./wizard"
import { pageError } from "@metaliq/forms"
import { fields, MetaView, tag } from "@metaliq/presentation"

export const wizardView: MetaView<any> = $ => [
  wizardTramline($),
  wizardStep($)
]

const tramStop: MetaView<any> = $ => html`
  <div class="mq-wizard-nav-item ${classMap({
    current: $.key === $.parent$.state.step,
    visited: $.state.validated,
    enabled: false
  })}" @click=${$.parent$.up(changeStep({ stepName: $.key }))}>
    <div class="mq-wizard-nav-pre"></div>
    <div class="mq-wizard-nav-anchor"></div>
    <div class="mq-wizard-nav-highlight"></div>
    <div class="mq-wizard-nav-post"></div>
    <span class="mq-wizard-nav-label">${$.term("label")}</span>
  </div>
`

export const wizardTramline: MetaView<any> = tag(".mq-wizard-nav", fields({ view: tramStop }))

export const wizardStep: MetaView<any> = wizard$ => {
  const currentStep$ = (wizard$.meta as Meta<any>)[wizard$.state.step].$ as Meta$<any>
  const labels = {
    forwards: forwardsLabel(currentStep$),
    backwards: backwardsLabel(currentStep$)
  }

  return html`
    <div class="mq-wizard-step ${classMap({
      "step-forward": wizard$.state.stepChangeDirection === "forwards",
      "step-backward": wizard$.state.stepChangeDirection === "backwards"
    })}">
      <div class="mq-wizard-page-title">
        ${currentStep$
          ? currentStep$.term("helpText")
          : notConfiguredWarning
        }
      </div>
      <div>
        ${currentStep$
          ? currentStep$.view()
          : notConfiguredWarning
        }
        ${pageError(currentStep$)}
      </div>
      ${currentStep$.model.wizard ? "" : html`
        <div class="mq-wizard-buttons">
          ${labels.backwards === false ? html`<span></span>` : html`
            <button class="mq-button"
              @click=${wizard$.up(changeStep({ direction: "backwards" }))}>
              ${labels.backwards && typeof labels.backwards === "string"
                ? labels.backwards
                : "Previous"
              }
            </button>
          `}
          ${labels.forwards === false ? html`<span></span>` : html`
            <button class="mq-button mq-primary-button"
              @click=${wizard$.up(changeStep({ direction: "forwards" }))}>
              ${labels.forwards && typeof labels.forwards === "string"
                ? labels.forwards
                : "Next"
              }
            </button>
          `}
        </div>
      `}
    </div>
  `
}

const notConfiguredWarning = "This MetaModel is not configured as a wizard. Add a `wizard` term."
