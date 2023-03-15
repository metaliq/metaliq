import { ViewResult } from "./presentation"
import { guard } from "lit/directives/guard.js"
import { html } from "lit"

export type OnLookup<T> = (data: T) => any

export type LookupProcess<T> = {
  onStart?: OnLookup<T>
  onResult?: OnLookup<T>
}

export type InitLookup<T> = (
  elem: HTMLInputElement,
  lookupProcess: LookupProcess<T>
) => any

export type LookupTemplate = (id: string) => ViewResult

/**
 * Initialise a lookup field factory using the given InitLookup function,
 * which should add suitable event handling to the given HTML element
 * to trigger a result handler with the appropriately typed result.
 *
 * The lookup will be initialised upon first render,
 * and thereafter only upon change of object identity of the data parameter,
 * enabling efficient handling across intermediate renders.
 */
export const lookupFromTemplate = <T>(initLookup: InitLookup<T>) => (
  data: T,
  template: LookupTemplate,
  lookupProcess: LookupProcess<T> = {}
) => guardViewResult(data, () => {
  // Wrap the onResult handler to first assign the result
  const lookupProcessWithWrappedHandler: LookupProcess<T> = {
    onResult: result => {
      Object.assign(data, result)
      lookupProcess.onResult?.(result)
    }
  }

  const id = `lookup-${Math.ceil(Math.random() * 999999)}`

  setTimeout(() => {
    initLookup(document.querySelector(`#${id}`), lookupProcessWithWrappedHandler)
  }, 1000)

  return template(id)
})

// A wrapper around a plain guard directive in order to return a ViewResult
export const guardViewResult = (value: unknown, fn: () => unknown): ViewResult => html`${guard(value, fn)}`
