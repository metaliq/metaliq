import { $fn, MetaSpec } from "../../../meta"
import { closeModalChannel, showModalChannel } from "./modal-procs"
import { ViewResult } from "../presentation"
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
  view: $fn(modal),
  channels: [
    showModalChannel,
    closeModalChannel
  ],
  init: {
    title: "",
    body: ""
  }
}
