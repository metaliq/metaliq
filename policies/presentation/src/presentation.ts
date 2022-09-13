import { render, TemplateResult } from "lit"
import { child$, FieldKey, FieldType, getDynamicTerm, m$, MetaFn, metaSetups } from "metaliq"

export { PublicationTarget } from "@metaliq/publication"
export { ApplicationSpec } from "@metaliq/application"
export { TerminologySpec } from "@metaliq/terminology"
export { ValidationSpec } from "@metaliq/validation"

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

export interface PresentationState {
  active?: boolean
}

declare module "metaliq" {
  namespace Policy {
    interface Specification<T, P> extends PresentationSpec<T, P> { }
    interface State<T, P> extends PresentationState {
      this?: State<T, P>
    }
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
    if ($.spec.view || !$.spec.publicationTarget) {
      $.spec.review = $.spec.review || renderPage
      Object.assign(window, { meta: $ })
      document.title = getDynamicTerm("label")($.value, $)
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
 * Third, it returns a meta view that, if provided with only a value,
 * will attempt to deduce the meta info,
 * so the "inner" view function does not necessarily have to.
 * As with other meta functions, meta info deduction does not work for primitives
 * and may be unreliable where the same value object is shared by multiple meta objects / specs.
 * Fourth, if both a value and meta info are provided,
 * the $ backlink on the value object will be re-established.
 * This can assist in situations where a single value object is being shared
 * (with possibly different specifications) across multiple points in the meta graph.
 *
 * ```
 * view()(myValue) // View myValue with the view from the spec, if present
 * view(maybeView)(myValue) // View using maybeView if present, otherwise fall back to spec view if present
 * view([firstView, secondView])(myValue) // View myValue using two different views sequentially
 * ```
 */
export function view <T, P = any> (
  metaViewTerm?: MetaViewTerm<T, P>
): MetaView<T, P> {
  return (v, $ = m$(v)) => {
    if (typeof (v ?? false) === "object") {
      // Establish correct value/meta link prior to viewing
      Object.assign(v, { $ })
    }
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
 * Display a field for the given parent and key, optionally with a specific view.
 */
export const field = <P, K extends FieldKey<P>> (
  parent: P, key: K, fieldView?: MetaViewTerm<FieldType<P, K>, P>
) => {
  const field$ = child$(parent, key)
  return view(fieldView)(field$.value, field$)
}
