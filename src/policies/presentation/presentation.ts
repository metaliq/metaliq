import { render, TemplateResult } from "lit"
import { MetaFn, metaSetups } from "../../meta"
import { metaForm } from "./widgets"
import { label } from "../terminology/terminology"

export interface PresentationSpec<T, P> {
  view?: MetaView<T, P>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends PresentationSpec<T, P> { }
  }
}

/**
 * A view function takes a meta-object and returns a template result.
 */
export type SingularResult = TemplateResult | string
export type ViewResult = SingularResult | ViewResult[]
export type View<T> = (model: T) => ViewResult
export type MetaView<T, P = any, C = any> = MetaFn<T, P, C, ViewResult>

metaSetups.push(meta => {
  // Default the review method of the top level spec to renderPage if not assigned and this policy has been loaded
  if (!meta.$.parent) {
    if (!meta.$.spec.publication?.target && !meta.$.spec.view) {
      meta.$.spec.view = metaForm()
    }
    if (meta.$.spec.view) {
      meta.$.spec.review = meta.$.spec.review || renderPage
      Object.assign(window, { meta })
      document.title = label(meta)
    }
  }
})

/**
 * A widget takes some configuration and returns a View.
 */
export type Widget<T, P = any> = (...params: any[]) => MetaView<T, P>

/**
 * The renderPage function, if specified as the review property from the app policy,
 * produces a global-state single page app.
 */
export const renderPage: MetaFn<any> = (value, meta) => {
  render(meta.$.spec.view(value, meta), document.body)
}
