import { commit, FieldKey, Meta, MetaFn, metaSetups, reset } from "../../meta"
import { validateAll } from "../validation/validation"
import { metaForm } from "./widgets"
import { wait } from "../../util/util"
import { up } from "@metaliq/up"
import { MetaView } from "./presentation"
import { label } from "../terminology/terminology"

export interface WizardSpec<T, P> {
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
     * Override the default label, or set to false to hide the button.
     */
    forwardsLabel?: string | boolean

    /**
     * Override the default label, or set to false to hide the button.
     */
    backwardsLabel?: string | boolean
  }
}

export interface WizardState<T> {
  step?: FieldKey<T>
  stepChangeDirection?: StepDirection
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends WizardSpec<T, P> {}
    interface State<T, P> extends WizardState<T>{
      this?: State<T, P>
    }
  }
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
  nowStep: Meta<any>
}

// Register of any metas that are configured as a wizard
const wizardMetas: Array<Meta<any>> = []

metaSetups.push(<T>(meta: Meta<T>) => {
  if (meta.$.spec.wizard) {
    wizardMetas.push(meta)
    const stepNames = Object.keys(meta.$.spec.fields) as Array<FieldKey<T>>
    for (const stepName of stepNames) {
      const step = meta[stepName]
      if (!step.$.spec.view) step.$.spec.view = <unknown>metaForm() as MetaView<any>
    }
    const firstStepName = stepNames[0]
    const stepMeta = meta[firstStepName] as Meta<any>
    reset(stepMeta)
    return {
      step: firstStepName
    }
  }
})

/**
 * Reset backlinks and transient values on current step of wizard at any level of nesting.
 */
function resetStepMetas () {
  wizardMetas.forEach(wizard => {
    const { nowStep } = getWizardInfo(wizard)
    reset(nowStep)
  })
}

export const getWizardInfo = <T> (wizard: Meta<T>): WizardInfo<T> => {
  const stepNames = Object.keys(wizard.$.spec.fields) as Array<FieldKey<T>>
  const nowIndex = stepNames.indexOf(wizard.$.state.step)
  const nowStep = wizard[stepNames[nowIndex]] as Meta<any>
  return { stepNames, nowIndex, nowStep }
}

export const changeStep = <T> (stepChange: StepChange<T>) => async (wizard: Meta<T>) => {
  // Deduce indices of current and next step
  const { stepNames, nowIndex, nowStep } = getWizardInfo(wizard)

  const nextIndex = stepChange.direction
    ? stepChange.direction === "forwards" ? nowIndex + 1 : nowIndex - 1
    : stepNames.indexOf(stepChange.stepName)
  if (nextIndex < 0 || nextIndex >= stepNames.length) { // Index out of bounds
    if (wizard.$.parent?.$.spec.wizard) {
      const direction: StepDirection = nextIndex < 0 ? "backwards" : "forwards"
      await changeStep({ direction })(wizard.$.parent as Meta<unknown>)
    }
    return
  }

  if (!wizard.$.spec.wizard?.unconstrained) {
    // Perform validation unless wizard is unconstrained
    const nextStep = wizard[stepNames[nextIndex]] as Meta<any>
    if (nextIndex > nowIndex + 1 && !nextStep.$.state.validated) return

    const errorMetas = validateAll(nowStep)
    if (errorMetas.length && nextIndex > nowIndex) {
      window?.scrollTo?.({ top: 0, behavior: "smooth" })
      return
    }
  } else {
    // For an unconstrained wizard, count all steps up to the new one as validated
    for (const previousStep of stepNames.slice(0, nextIndex)) {
      wizard[previousStep].$.state.validated = true
    }
  }

  commit(nowStep)
  const onComplete = nowStep.$.spec.wizardStep?.onComplete
  if (typeof onComplete === "function") {
    const completionResponse = await onComplete(nowStep)
    if (completionResponse === false) return
  }
  wizard.$.state.step = stepNames[nextIndex]
  resetStepMetas()

  window.history.pushState({}, label(nowStep))
  window.onpopstate = (evt: PopStateEvent) => {
    up(changeStep({ stepName: stepNames[nowIndex] }), wizard)()
  }

  wizard.$.state.stepChangeDirection = (nextIndex > nowIndex) ? "forwards" : "backwards"
  window?.scrollTo?.({ top: 0, behavior: "smooth" })
  await wait(25) // Delay to allow transition
  wizard.$.state.stepChangeDirection = null
}
