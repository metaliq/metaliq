import { render, TemplateResult } from "lit"
import { Meta, metaSetups } from "../../meta"

export interface PresentationSpec<T, P> {
  view?: MetaView<T, P>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends PresentationSpec<T, P> {}
  }
}

/**
 * A view function takes a meta-object and returns a template result.
 */
export type SingularResult = TemplateResult | string
export type ViewResult = SingularResult | ViewResult[]
export type View<T> = (model: T) => ViewResult
export type MetaView<T, P = any> = (meta: Meta<T, P>) => ViewResult

export const metaView = <T, P = any> (view: View<T>): MetaView<T, P> =>
  meta => view(meta.$.value)

// TODO: Move to app.js / postStart
metaSetups.push(meta => {
  // Default the review method of the top level spec to renderPage if not assigned and this policy has been loaded
  if (!meta.$.parent && meta.$.spec.view && !meta.$.spec.review) {
    meta.$.spec.review = renderPage
    Object.assign(window, { meta })
    document.title = meta.$.spec.label
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
export const renderPage = (meta: Meta<any>) => {
  render(meta.$.spec.view(meta), document.body)
}
