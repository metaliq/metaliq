import { render, TemplateResult } from "lit"
import { meta, MetaFn, metaSetups } from "../../meta"
import { metaForm } from "./widgets"
import { label } from "../terminology/terminology"
import { review } from "../application/application"

export interface PresentationSpec<T, P, C> {
  view?: MetaViewTerm<T, P, C>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P, C> extends PresentationSpec<T, P, C> { }
  }
}

/**
 * A view function takes a meta-object and returns a template result.
 */
export type SingularResult = TemplateResult | string
export type ViewResult = SingularResult | ViewResult[]
export type View<T> = (model: T) => ViewResult
export type MetaView<T, P = any, C = any> = MetaFn<T, P, C, ViewResult>
export type MetaViewTerm<T, P = any, C = any> = MetaView<T, P, C> | Array<MetaView<T, P, C>>

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
  render(specView(value, meta), document.body)
}

/**
 * Get a ViewResult for the given meta or its value proxy using its specified view.
 */
export const specView: MetaFn<any, any, any, ViewResult> = (v, m) => {
  m = m || meta(v)
  return view(m.$.spec.view)(v, m)
}

/**
 * Get a ViewResult for the given meta or its value proxy using its specified view.
 */
export const specViewWithFallback =
  <T, P = any, C = any>(fallback: MetaViewTerm<T, P, C>): MetaFn<any, any, any, ViewResult> =>
    (v, m) => {
      m = m || meta(v)
      return m.$.spec.view
        ? view(m.$.spec.view)(v, m)
        : view(fallback)(v, m)
    }

/**
 * Get a ViewResult for the given view and meta.
 */
export const view = <T, P = any, C = any>(metaView: MetaViewTerm<T, P, C>): MetaFn<T, P, C, ViewResult> =>
  (v, m) => {
    m = m || meta(v)
    if (m.$.parent) review(m) // Don't review on top level, this is auto done in renderPage
    return metaView
      ? Array.isArray(metaView)
        ? metaView.map(mv => view(mv)(v, m))
        : metaView(v, m)
      : ""
  }
