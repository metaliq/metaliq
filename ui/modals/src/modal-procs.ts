import { call } from "@metaliq/communication"
import { ModalButton, ModalInfo } from "./modal-model"
import { MetaFn } from "metaliq"
import { ViewResult } from "@metaliq/presentation"

export const modalDefaults = {
  closeLabel: "OK",
  progressIndicator: "bi-arrow-repeat mq-modal-progress-indicator"
}

const closeButton: ModalButton = {
  label: modalDefaults.closeLabel,
  up: () => { closeModal() }
}

export const showModalChannel = (newModalInfo: ModalInfo): MetaFn<ModalInfo> => (modalInfo, modalInfo$) => {
  modalInfo$.value = newModalInfo
}

export const closeModalChannel = (): MetaFn<ModalInfo> => (modalInfo, modalInfo$) => {
  modalInfo$.value = {
    body: "",
    title: ""
  }
}

export const showModal = call(showModalChannel)

export const closeModal = call(closeModalChannel)

export const showMessage = (body: ViewResult, title: string = "") => {
  showModal({ title, body, buttons: [closeButton] })
}

export const showProgress = (body: ViewResult, title: string = "") => {
  showModal({ title, body, iconClasses: modalDefaults.progressIndicator })
}

/**
 * Show a message for a field then refocus on that field.
 */
export const showThenFocus = (element: HTMLInputElement) => (content: ViewResult, title: string = "") => {
  element.focus()
  showModal({
    title,
    body: content,
    buttons: [{
      label: modalDefaults.closeLabel,
      up: () => {
        element.focus()
        closeModal()
      }
    }]
  })
  return element
}
