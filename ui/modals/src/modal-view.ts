import { html } from "lit"
import { up } from "@metaliq/up"
import { ModalInfo } from "./modal-model"
import { MetaView } from "@metaliq/presentation"

export const modal: MetaView<ModalInfo> = $ => {
  const info = $.value
  return info?.body ? html`
    <div class="mq-modal-mask">
      <div class="mq-modal ${info.classes}">
        <div class="mq-modal-header">
          ${info.title}
        </div>
        <div class="mq-modal-body">
          ${$.view(info.body)}
        </div>
        ${info.iconClasses ? html`
          <div class="mq-modal-icon-container">
            <div class="mq-modal-icon">
              <i class=${info.iconClasses}></i>
            </div>
          </div>
        ` : ""}
        ${info.buttons ? html`
          <div class="mq-modal-buttons">
            ${info.buttons.map(button => html`
              <button type="button" class="mq-button ${button.classes}" 
                @click=${up(button.up, button.data)} >
                ${button.label}
              </button>
            `)}
          </div>
        ` : ""} 
      </div>  
    </div>
  ` : ""
}
