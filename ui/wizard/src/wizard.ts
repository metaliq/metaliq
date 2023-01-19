import { child$, FieldKey, isMeta, isMetaFn, Meta, Meta$, MetaFn, metaSetups } from "metaliq"
import { validateAll } from "@metaliq/validation"
import { metaForm } from "@metaliq/forms"
import { wait } from "@metaliq/util"
import { up } from "@metaliq/up"
import { MetaView } from "@metaliq/presentation"

export type StepLabel = string | boolean

export interface WizardSpec<T, P = any> {
  wizard?: {
    /**
     * Set this to allow selection of any step at any time without validation.
     */
    unconstrained?: boolean
  }
  wizardStep?: {
    /**
     * A function to run on completion of the step.
     * If it returns boolean `false` then navigation will not proceed.
     */
    onComplete?: MetaFn<T, P>

    /**
     * Override the default label, or set to empty to hide the button.
     */
    forwardsLabel?: StepLabel | MetaFn<T, P, StepLabel>

    /**
     * Override the default label, or set to empty to hide the button.
     */
    backwardsLabel?: StepLabel | MetaFn<T, P, StepLabel>
  }
}

export interface WizardState<T> {
  step?: FieldKey<T>
  stepChangeDirection?: StepDirection
}

declare module "metaliq" {
  namespace Policy {
    interface Specification<T, P> extends WizardSpec<T, P> {}
    interface State<T, P> extends WizardState<T>{
      this?: State<T, P>
    }
  }
}

// Can't use getSpecValue as it is nested
// TODO: EITHER make a nested version of getSpecValue OR switch to a review-and-state model
export const forwardsLabel: MetaFn<any, any, StepLabel> = (value, $) => {
  const label = $.spec.wizardStep?.forwardsLabel
  if (isMetaFn(label)) return label(value, $)
  else return label
}

export const backwardsLabel: MetaFn<any, any, StepLabel> = (value, $) => {
  const label = $.spec.wizardStep?.backwardsLabel
  if (isMetaFn(label)) return label(value, $)
  else return label
}

export type StepDirection = "forwards" | "backwards"

/**
 * Information for a step change action.
 */
export type StepChange<T> = {
  stepName?: FieldKey<T>
  direction?: "forwards" | "backwards"
}

/**
 * Derived aspects of the current wizard state.
 */
export type WizardInfo<T> = {
  stepNames: Array<FieldKey<T>>
  nowIndex: number
  nowStep$: Meta$<any>
}

metaSetups.push(<T>($: Meta$<T>) => {
  if ($.spec.wizard && isMeta($.meta)) {
    const stepNames = Object.keys($.spec.fields) as Array<FieldKey<T>>
    for (const stepName of stepNames) {
      const step = $.meta[stepName]
      if (!step.$.spec.view) step.$.spec.view = <unknown>metaForm() as MetaView<any>
    }
    $.state.step = stepNames[0]
  }
})

export const getWizardInfo = <T> (wizard$: Meta$<T>): WizardInfo<T> => {
  const stepNames = Object.keys(wizard$.spec.fields) as Array<FieldKey<T>>
  const nowIndex = stepNames.indexOf(wizard$.state.step)
  const nowStep$ = child$(wizard$, stepNames[nowIndex])
  return { stepNames, nowIndex, nowStep$ }
}

export const changeStep = <T> (stepChange: StepChange<T>) => async (wizard$: Meta$<T>) => {
  // Deduce indices of current and next step
  const { stepNames, nowIndex, nowStep$ } = getWizardInfo(wizard$)

  const nextIndex = stepChange.direction
    ? stepChange.direction === "forwards" ? nowIndex + 1 : nowIndex - 1
    : stepNames.indexOf(stepChange.stepName)
  if (nextIndex < 0 || nextIndex >= stepNames.length) { // Index out of bounds
    if (wizard$.parent?.$.spec.wizard) {
      const direction: StepDirection = nextIndex < 0 ? "backwards" : "forwards"
      await changeStep({ direction })(wizard$.parent.$)
    }
    return
  }

  if (!wizard$.spec.wizard?.unconstrained) {
    // Perform validation unless wizard is unconstrained
    const nextStep = (wizard$.meta as Meta<any>)[stepNames[nextIndex]] as Meta<any>
    if (nextIndex > nowIndex + 1 && !nextStep.$.state.validated) return

    const errorMetas = validateAll(nowStep$)
    if (errorMetas.length && nextIndex > nowIndex) {
      window?.scrollTo?.({ top: 0, behavior: "smooth" })
      return
    }
  } else {
    // For an unconstrained wizard, count all steps up to the new one as validated
    for (const previousStep of stepNames.slice(0, nextIndex)) {
      (wizard$.meta as Meta<any>)[previousStep].$.state.validated = true
    }
  }

  const onComplete = nowStep$.spec.wizardStep?.onComplete
  if (typeof onComplete === "function") {
    const completionResponse = await onComplete(nowStep$.value, nowStep$)
    if (completionResponse === false) return
  }
  wizard$.state.step = stepNames[nextIndex]

  window.history.pushState({}, nowStep$.state.label)
  window.onpopstate = (evt: PopStateEvent) => {
    up(changeStep({ stepName: stepNames[nowIndex] }), wizard$)()
  }

  wizard$.state.stepChangeDirection = (nextIndex > nowIndex) ? "forwards" : "backwards"
  window?.scrollTo?.({ top: 0, behavior: "smooth" })
  await wait(25) // Delay to allow transition
  wizard$.state.stepChangeDirection = null
}
