import { render, TemplateResult } from "lit"
import { child$, FieldKey, FieldType, m$, MetaFn, metaSetups } from "../../meta"

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
 * A view is a meta function for a data type that returns a view result for rendering.
 */
export type MetaView<T, P = any> = MetaFn<T, P, ViewResult>

/**
 * A view result can be either singular or plural
 * (in which case they are rendered in sequence).
 */
export type ViewResult = SingularViewResult | ViewResult[]

/**
 * An individual view result can be a simple string or a dynamic template.
 */
export type SingularViewResult = TemplateResult | string

/**
 * Term to specify meta views, can be either singular or plural
 * (in which case each view result (which themselves may be singular or plural) is rendered in sequence).
 */
export type MetaViewTerm<T, P = any> = MetaView<T, P> | Array<MetaView<T, P>>

metaSetups.push($ => {
  // Default the review method of the top level spec to renderPage if not assigned and this policy has been loaded
  if (!$.parent) {
    // TODO: These should go into runtime target
    if ($.spec.view || !$.spec.publication?.target) {
      $.spec.review = $.spec.review || renderPage
      Object.assign(window, { meta: $ })
      document.title = $.state.label
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
 * Calling `view(myView)(myValue, myMeta$?)` has several advantages over calling `myView(myValue, myMeta$)`:
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
  metaViewTerm?: MetaViewTerm<T, P>
): MetaFn<T, P, ViewResult> {
  return (v, $ = m$(v)) => {
    metaViewTerm = metaViewTerm ?? $.spec.view
    if (!metaViewTerm) {
      return ""
    } else if (Array.isArray(metaViewTerm)) {
      return metaViewTerm.map(mv => view(mv)(v, $))
    } else {
      if (typeof $.spec.hidden === "function") {
        return hideShowWrapper(metaViewTerm)(v, $)
      } else {
        return $.state.hidden ? "" : metaViewTerm(v, $)
      }
    }
  }
}

/**
 * Display a field for the given parent and key.
 * Optionally specify the meta view to use, otherwise defaults to spec view.
 * Handles dynamic and potentially animated hide/show
 * based on `hidden` spec term from validation policy.
 */
export const field = <P, K extends FieldKey<P>> (
  parent: P, key: K, fieldView?: MetaViewTerm<FieldType<P, K>, P>
) => {
  const field$ = child$(m$(parent), key)
  return view(fieldView)(field$.value, field$)
}
