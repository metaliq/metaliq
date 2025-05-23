import { MetaModel } from "metaliq"
import { closeModalChannel, showModalChannel } from "./modal-procs"
import { MetaViewTerm } from "@metaliq/presentation"
import { modal } from "./modal-view"
import { TERMINOLOGY } from "@metaliq/terminology"
import { APPLICATION } from "@metaliq/application"

TERMINOLOGY()
APPLICATION()

export type ModalInfo = {
  /**
   * Main modal title.
   */
  title?: string

  /**
   * Modal body display content.
   */
  body?: MetaViewTerm<ModalInfo>

  /**
   * Modal buttons.
   */
  buttons?: ModalButton[]

  /**
   * Modal is a progress indicator rather than an interactive prompt.
   */
  isProgress?: boolean

  /**
   * Class(es) for the top level modal element.
   */
  classes?: string

  /**
   * Class(es) for the icon element.
   */
  iconClasses?: string
}

export type ModalButton = {
  /**
   * Main button label.
   */
  label: string

  /**
   * Click action update.
   */
  up: (...params: any[]) => any

  /**
   * Data parameter for click action update.
   */
  data?: any

  /**
   * Additional class(es).
   */
  classes?: string
}

export const modalModel: MetaModel<ModalInfo> = {
  label: "Modal Display",
  view: modal,
  channels: [
    showModalChannel,
    closeModalChannel
  ],
  init: {
    title: null,
    body: null,
    buttons: [],
    isProgress: false
  }
}
