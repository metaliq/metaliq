import { render, TemplateResult } from "lit"
import { MetaFn, metaSetups } from "../../meta"
import { label } from "../terminology/terminology"

export interface PresentationSpec<T, P> {
  /**
   * The primary view associated with this specification.
   */
  view?: MetaViewTerm<T, P>

  /**
   * An auxiliary view, such as for a contextual control zone.
   */
  controlView?: MetaViewTerm<T, P>

  /**
   * An auxiliary view, such as for a contextual status zone.
   */
  statusView?: MetaViewTerm<T, P>
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
export type MetaView<T, P = any> = MetaFn<T, P, ViewResult>
export type MetaViewTerm<T, P = any> = MetaView<T, P> | Array<MetaView<T, P>>

metaSetups.push($ => {
  // Default the review method of the top level spec to renderPage if not assigned and this policy has been loaded
  if (!$.parent) {
    // TODO: These should go into runtime target
    if ($.spec.view || !$.spec.publication?.target) {
      $.spec.review = $.spec.review || renderPage
      Object.assign(window, { meta: $ })
      document.title = label($)
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
  render(view()(value, meta), document.body)
}

/**
 * A view designed to accept and wrap another view.
 */
export type ViewWrapper = <T> (metaView: MetaView<T>) => MetaView<T>

/**
 * A wrapper for dynamic hide-show fields, to do animation for example.
 */
let hideShowWrapper: ViewWrapper = null
export function setHideShowWrapper (wrapper: ViewWrapper) {
  hideShowWrapper = wrapper
}

/**
 * Get a ViewResult for the given meta.
 * If the view is not specified, will fall back to the spec view.
 * Calling `view(myView)(myValue, myMeta?)` has several advantages over calling `myView(myValue, myMeta)`:
 *
 * First, it can accommodate either a single view or an array of views - enabling the
 * view term of a meta to accomodate multiple views.
 * Second, it automatically handles dynamic hide / show.
 * Third, if provided with only a value it will deduce the meta, except for primitive values.
 *
 * There is also handling provided for default views and fallbacks.
 *
 * ```
 * view()(myValue) // View myValue with the view from the spec, if present
 * view(maybeView)(myValue) // View using maybeView if present, otherwise nothing (no fallback)
 * view(true, maybeView)(myValue) // Use the view from the spec if present, else fall back to maybeView
 * view(maybeView, true)(myValue) // View myValue with maybeView if it exists, else view from spec if present
 * view(maybeView, otherView)(myValue) // View myValue with maybeView if it exists, else use otherView (no fallback to spec view)
 * ```
 */
export function view <T, P = any> (
  primary?: boolean | MetaViewTerm<T, P>, fallback?: boolean | MetaViewTerm<T, P>
): MetaFn<T, P, ViewResult> {
  return (v, $) => {
    if (arguments.length === 0 || primary === true) primary = $.spec.view
    if (fallback === true) fallback = $.spec.view
    const metaView = (primary || fallback) as MetaViewTerm<T, P>
    if (!metaView) {
      return ""
    } else if (Array.isArray(metaView)) {
      return metaView.map(mv => view(mv)(v, $))
    } else {
      if (typeof $.spec.hidden === "function") {
        return hideShowWrapper(metaView)(v, $)
      } else {
        return $.state.hidden ? "" : metaView(v, $)
      }
    }
  }
}
