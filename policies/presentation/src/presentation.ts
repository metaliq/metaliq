import { render, TemplateResult } from "lit"
import { $fn, child$, FieldKey, MetaFn, metaSetups } from "metaliq"

export { PublicationTarget } from "@metaliq/publication"
export { ApplicationTerms } from "@metaliq/application"
export { TerminologyTerms } from "@metaliq/terminology"
export { ValidationTerms } from "@metaliq/validation"

export interface PresentationTerms<T, P> {
  /**
   * The primary view associated with this MetaModel.
   */
  view?: MetaView<T, P>

  /**
   * An auxiliary view, such as for a contextual control zone.
   */
  controlView?: MetaView<T, P>

  /**
   * An auxiliary view, such as for a contextual status zone.
   */
  statusView?: MetaView<T, P>
}

export interface PresentationState {
  active?: boolean
}

export interface PresentationAspects<T, P> {
  /**
   * Render a view for the Meta$ and its associated data value.
   *
   * Calling `$.view({ view: myView })` has several advantages over calling `myView(myValue, myMeta$)`:
   *
   * First, it automatically uses any default wrapper assigned using setViewWrapper.
   * This allows for central handling of animated hide/show, for example.
   *
   * Second, the $ backlink on the value object will be re-established.
   * This can assist in situations where a single value object is being shared
   * (with possibly different MetaModels) across multiple points in the meta graph.
   *
   * ```
   * $.view() // View the data value with the view from the model, if present
   * $.view({ view: maybeView }) // View using maybeView if present, otherwise fall back to model view if present
   * ```
   */
  view: (options?: ViewOptions<T, P>) => ViewResult

  /**
   * Present a view for the given child field
   */
  field: (key: FieldKey<T>, options?: ViewOptions<T, P>) => ViewResult
}

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends PresentationTerms<T, P> { }
    interface State<T, P> extends PresentationState {
      this?: State<T, P>
    }
    interface Aspects<T, P> extends PresentationAspects<T, P> { }
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

/**
 * A widget takes some configuration and returns a View.
 */
export type Widget<T, P = any> = (...params: any[]) => MetaView<T, P>

/**
 * The renderPage function, if specified as the review property from the app policy,
 * produces a global-state single page app.
 */
export const renderPage: MetaFn<any> = (v, $) => {
  render($.view(), document.body)
}

/**
 * A view designed to accept and wrap another view.
 */
export type ViewWrapper<T = any> = (metaView: MetaView<T>) => MetaView<T>

/**
 * Assign a default view wrapper, for example to do animation for dynamic hide-show fields.
 */
export const setViewWrapper = (wrapper: ViewWrapper) => {
  viewWrapper = wrapper
}
let viewWrapper: ViewWrapper = null

/**
 * A function to obtain a MetaView appropriate for the given Meta$.
 */
export type ViewResolver<T = any, P = any> = MetaFn<T, P, MetaView<T, P>>

/**
 * Assign a default viewResolver, for example to determine a default form field given data type.
 */
export const setViewResolver = (resolver: ViewResolver) => {
  viewResolver = resolver
}
let viewResolver: ViewResolver = null

/**
 * The options type for the `$.view()` aspect.
 */
export type ViewOptions<T, P = any> = {
  /**
   * Optionally specify the view to use like `$.view({ view: myView })`.
   * If not provided then revert to the default view for the
   */
  view?: MetaView<T, P>

  /**
   * Override or disable (by passing `false`) any default wrapper provided to {@link setViewWrapper}.
   */
  wrapper?: ViewWrapper | boolean

  /**
   * Override or disable (by passing `false`) any default resolver assigned to {@link setViewResolver}
   */
  resolver?: ViewResolver | boolean
}

metaSetups.push($ => {
  $.view = options => {
    const wrapper = typeof options.wrapper === "boolean"
      ? options.wrapper ? viewWrapper : undefined
      : options.wrapper || viewWrapper
    const resolver = typeof options.resolver === "boolean"
      ? options.resolver ? viewResolver : undefined
      : options.resolver || viewResolver

    const view = options.view || $.model.view || resolver($.value, $)
    if (!view) return ""

    if (wrapper) return wrapper(view)($.value, $)

    return $.state.hidden ? "" : view($.value, $)
  }

  $.field = (key, options) => {
    const field$ = child$($, key)
    return field$.view(options)
  }
})

/**
 * Get a ViewResult for the given value and meta info.
 * If the view is not specified, will fall back to the MetaModel's view.
 * Calling `view(myView)(myValue, myMeta$?)` has several advantages over calling `myView(myValue, myMeta$)`:
 *
 * First, it can accommodate either a single view or an array of views - enabling the
 * view term of a meta to accommodate multiple views.
 *
 * Second, it automatically handles dynamic hide / show.
 *
 * Third, it returns a meta view that, if provided with only a value,
 * will attempt to deduce the meta info,
 * so the "inner" view function does not necessarily have to.
 * As with other meta functions, meta info deduction does not work for primitives
 * and may be unreliable where the same value object is shared by multiple meta-model objects.
 *
 * Fourth, if both a value and meta info are provided,
 * the $ backlink on the value object will be re-established.
 * This can assist in situations where a single value object is being shared
 * (with possibly different MetaModels) across multiple points in the meta graph.
 *
 * ```
 * view()(myValue) // View myValue with the view from the model, if present
 * view(maybeView)(myValue) // View using maybeView if present, otherwise fall back to model view if present
 * view([firstView, secondView])(myValue) // View myValue using two different views sequentially
 * ```
 */
export function view <T, P = any> (
  metaViewTerm?: MetaViewTerm<T, P>
): MetaView<T, P> {
  return $fn((v, $) => {
    if (typeof (v ?? false) === "object") {
      // Establish correct value/meta link prior to viewing
      Object.assign(v, { $ })
    }
    metaViewTerm = metaViewTerm ?? $.model.view
    if (!metaViewTerm) {
      return ""
    } else if (Array.isArray(metaViewTerm)) {
      return metaViewTerm.map(mv => view(mv)(v, $))
    } else {
      if (typeof $.model.hidden === "function") {
        return viewWrapper(metaViewTerm)(v, $)
      } else {
        return $.state.hidden ? "" : metaViewTerm(v, $)
      }
    }
  })
}
