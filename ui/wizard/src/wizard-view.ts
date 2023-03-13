import { html } from "lit"
import { classMap } from "lit/directives/class-map.js"
import { fieldKeys, Meta, Meta$ } from "metaliq"

import { backwardsLabel, changeStep, forwardsLabel } from "./wizard"
import { pageError } from "@metaliq/forms"
import { MetaView } from "@metaliq/presentation"

export const wizardView: MetaView<object> = (value, $) => [
  wizardTramline(value, $),
  wizardStep(value, $)
]

export const wizardTramline: MetaView<object> = (value, $) => {
  return html`
    <div class="mq-wizard-nav">
      ${fieldKeys($.model).map((stepName) => html`
        <div class="mq-wizard-nav-item ${classMap({
          current: $.state.step === stepName,
          visited: $.child(stepName).state.validated,
          enabled: false
        })}" @click=${$.up(changeStep({ stepName }))}>
          <div class="mq-wizard-nav-pre"></div>
          <div class="mq-wizard-nav-anchor"></div>
          <div class="mq-wizard-nav-highlight"></div>
          <div class="mq-wizard-nav-post"></div>
          <span class="mq-wizard-nav-label">${$.child(stepName).term("label")}</span>
        </div>
      `)}
    </div>
  `
}

export const wizardStep: MetaView<any> = (value, wizard$) => {
  const currentStep$ = (wizard$.meta as Meta<any>)[wizard$.state.step].$ as Meta$<any>
  const currentValue = currentStep$.value
  const labels = {
    forwards: forwardsLabel(currentValue, currentStep$),
    backwards: backwardsLabel(currentValue, currentStep$)
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
        ${pageError(currentValue, currentStep$)}
      </div>
      ${currentStep$.model.wizard ? "" : html`
        <div class="mq-wizard-buttons">
          ${labels.backwards === false ? "" : html`
            <button class="mq-button"
              @click=${wizard$.up(changeStep({ direction: "backwards" }))}>
              ${labels.backwards || "Previous"}
            </button>
          `}
          ${labels.forwards === false ? "" : html`
            <button class="mq-button mq-primary-button"
              @click=${wizard$.up(changeStep({ direction: "forwards" }))}>
              ${labels.forwards || "Next"}
            </button>
          `}
        </div>
      `}
    </div>
  `
}

const notConfiguredWarning = "This MetaModel is not configured as a wizard. Add a `wizard` term."
