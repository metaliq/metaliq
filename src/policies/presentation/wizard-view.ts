import { html } from "lit"
import { classMap } from "lit/directives/class-map.js"
import { fieldKeys, Meta } from "../../meta"
import { up } from "@metaliq/up"

import { changeStep } from "./wizard"
import { pageError } from "./widgets"

export const wizardView = (wizard: Meta<any>) => [
  wizardTramline(wizard),
  wizardStep(wizard)
]

export const wizardTramline = (wizard: Meta<any>) => {
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
          <span class="mq-wizard-nav-label">${wizard[stepName].$.spec.label}</span>
        </div>
      `)}
    </div>
  `
}

export const wizardStep = (wizard: Meta<any>) => {
  const currentStep = wizard[wizard.$.state.step] as Meta<any>

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
          ? currentStep.$.spec.view(currentStep)
          : notConfiguredWarning}
        ${pageError(currentStep)}
      </div>
      ${currentStep.$.spec.wizard ? "" : html`
        <div class="mq-wizard-buttons">
          ${currentStep.$.spec.wizardStep?.backwardsLabel === false ? "" : html`
            <button class="mq-button"
              @click=${up(changeStep({ direction: "backwards" }), wizard)}>
              ${currentStep.$.spec.wizardStep?.backwardsLabel || "Previous"}
            </button>
          `}
          ${currentStep.$.spec.wizardStep?.forwardsLabel === false ? "" : html`
            <button class="mq-button mq-primary-button"
              @click=${up(changeStep({ direction: "forwards" }), wizard)}>
              ${currentStep.$.spec.wizardStep?.forwardsLabel || "Next"}
            </button>
          `}
        </div>
      `}
    </div>
  `
}

const notConfiguredWarning = "This spec is not configured as a wizard. Add a `wizard` term."
