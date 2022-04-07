import { html } from "lit"
import { classMap } from "lit/directives/class-map.js"
import { fieldKeys, Meta } from "../../meta"
import { up } from "@metaliq/up"

import { backwardsLabel, changeStep, forwardsLabel } from "./wizard"
import { pageError } from "./widgets"
import { label } from "../terminology/terminology"
import { MetaView, view } from "./presentation"

export const wizardView: MetaView<any> = (value, meta) => [
  wizardTramline(value, meta),
  wizardStep(value, meta)
]

export const wizardTramline: MetaView<any> = (value, wizard) => {
  return html`
    <div class="mq-wizard-nav">
      ${fieldKeys(wizard.$.spec).map((stepName) => html`
        <div class="mq-wizard-nav-item ${classMap({
      current: wizard.$.state.step === stepName,
      visited: wizard[stepName].$.state.validated,
      enabled: false
    })}" @click=${up(changeStep({ stepName }), wizard)}>
          <div class="mq-wizard-nav-pre"></div>
          <div class="mq-wizard-nav-anchor"></div>
          <div class="mq-wizard-nav-highlight"></div>
          <div class="mq-wizard-nav-post"></div>
          <span class="mq-wizard-nav-label">${label(wizard[stepName] as Meta<any>)}</span>
        </div>
      `)}
    </div>
  `
}

export const wizardStep: MetaView<any> = (value, wizard) => {
  const currentStep = wizard[wizard.$.state.step] as Meta<any>
  const currentValue = currentStep.$.value
  const labels = {
    forwards: forwardsLabel(currentValue, currentStep),
    backwards: backwardsLabel(currentValue, currentStep)
  }

  return html`
    <div class="mq-wizard-step ${classMap({
      "step-forward": wizard.$.state.stepChangeDirection === "forwards",
      "step-backward": wizard.$.state.stepChangeDirection === "backwards"
    })}">
      <div class="mq-wizard-page-title">
        ${currentStep
          ? currentStep.$.spec.helpText
          : notConfiguredWarning}
      </div>
      <div>
        ${currentStep
          ? view()(currentValue, currentStep)
          : notConfiguredWarning}
        ${pageError(currentValue, currentStep)}
      </div>
      ${currentStep.$.spec.wizard ? "" : html`
        <div class="mq-wizard-buttons">
          ${labels.backwards === false ? "" : html`
            <button class="mq-button"
              @click=${up(changeStep({ direction: "backwards" }), wizard)}>
              ${labels.backwards || "Previous"}
            </button>
          `}
          ${labels.forwards === false ? "" : html`
            <button class="mq-button mq-primary-button"
              @click=${up(changeStep({ direction: "forwards" }), wizard)}>
              ${labels.forwards || "Next"}
            </button>
          `}
        </div>
      `}
    </div>
  `
}

const notConfiguredWarning = "This spec is not configured as a wizard. Add a `wizard` term."
