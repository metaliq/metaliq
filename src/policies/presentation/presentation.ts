import { render, TemplateResult } from "lit"
import { meta, metaCall, MetaFn, metaSetups } from "../../meta"
import { metaForm } from "./widgets"
import { label } from "../terminology/terminology"
import { review } from "../application/application"
import { animatedHideShow } from "./animated-hide-show"

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
    // TODO: This should go into forms module
    if (!meta.$.spec.publication?.target && !meta.$.spec.view) {
      meta.$.spec.view = metaForm()
    }
    // TODO: These should go into runtime target
    if (meta.$.spec.view || !meta.$.spec.publication?.target) {
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
 * Get a ViewResult for the given meta.
 * If the view is not specified, will fall back to the spec view.
 * Calling `view(myView)(myValue, myMeta)` has several advantages over calling `myView(myValue, myMeta)`.
 * First, it can accommodate either a single view or an array of views - enabling the
 * view term of a meta to accomodate multiple views.
 * Second, it performs a review of all dynamic values on the meta, such as calcs and hidden.
 * Third, it automatically handles dynamic hide / show.
 */
export const view = <T, P = any, C = any>(metaView?: MetaViewTerm<T, P, C>): MetaFn<T, P, C, ViewResult> =>
  (v, m) => {
    m = m || meta(v)
    metaView = metaView || m.$.spec.view
    if (m.$.parent) review(m) // Don't review on top level, this is auto done in renderPage
    if (Array.isArray(metaView)) {
      return metaView.map(mv => view(mv)(v, m))
    } else if (metaView) {
      if (typeof m.$.spec.hidden === "function") {
        return metaCall(animatedHideShow(metaView))(m)
      } else {
        return m.$.state.hidden ? "" : metaCall(metaView)(m)
      }
    } else return ""
  }
