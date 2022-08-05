import { html } from "lit"
import { up } from "@metaliq/up"
import { ModalInfo } from "./modal-spec"

export const modal = (info: ModalInfo
) => info.body ? html`
  <div class="mq-modal-mask">
    <div class="mq-modal">
      <div class="mq-modal-header">
        ${info.title}
      </div>
      <div class="mq-modal-body">
        ${info.body}
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
            <button type="button" class="mq-button" 
              @click=${up(button.up, button.data)} >
              ${button.label}
            </button>
          `)}
        </div>
      ` : ""} 
    </div>  
  </div>
` : ""
