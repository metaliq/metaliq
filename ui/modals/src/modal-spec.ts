import { MetaSpec } from "metaliq"
import { closeModalChannel, showModalChannel } from "./modal-procs"
import { ViewResult } from "@metaliq/presentation"
import { modal } from "./modal-view"

export type ModalInfo = {
  title?: string
  body?: ViewResult
  buttons?: ModalButton[]
  isProgress?: boolean
  iconClasses?: string
}

export type ModalButton = {
  label: string
  up: (...params: any[]) => any
  data?: any
}

export const modalSpec: MetaSpec<ModalInfo> = {
  label: "Modal Display",
  view: modal,
  channels: [
    showModalChannel,
    closeModalChannel
  ],
  init: {
    title: "",
    body: ""
  }
}
