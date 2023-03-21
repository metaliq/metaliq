import { render, TemplateResult } from "lit"
import { FieldKey, isMeta, isMetaArray, Meta$, MetaFn } from "metaliq"

export { PublicationTarget } from "@metaliq/publication"
export { ApplicationTerms } from "@metaliq/application"
export { TerminologyTerms } from "@metaliq/terminology"
export { ValidationTerms } from "@metaliq/validation"

export interface PresentationTerms<T, P> {
  /**
   * The primary view associated with this MetaModel.
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

export interface Presentation$<T, P = any> {
  /**
   * Render a view for the Meta$ and its associated data value.
   *
   * Calling `$.view(myView)` has several advantages over calling `myView(v, $)`:
   *
   * * `myView` can be a MetaViewTerm, in other words can be an array of MetaViews.
   *
   * * If `myView` is undefined it will fall back to a view defined in the MetaModel.
   *
   * * If no `myView` or MetaModel view is defined, falls back to a view provided by
   * the {@link ViewResolver} assigned via {@link setViewResolver}. This can be overriden
   * or disabled with the {@link ViewOptions.resolver} option.
   *
   * * It automatically uses any default wrapper assigned using {@link setViewWrapper}.
   * This allows for global handling of animated hide/show, for example.
   * This can be overriden / disabled with the {@link ViewOptions.wrapper} option.
   *
   * * The $ backlink on the value object will be re-established.
   * This can assist in situations where a single value object is being shared
   * (with possibly different MetaModels) across multiple points in the meta graph.
   *
   * ```
   * $.view() // View the data value with the view from the model, if present
   * $.view(maybeView) // View using maybeView if present, otherwise fall back to model view if present
   * ```
   */
  view: (view?: MetaViewTerm<T, P>, options?: ViewOptions<T, P>) => ViewResult

  /**
   * Present a view for the given child field
   */
  field: <K extends FieldKey<T>> (key: K, view?: MetaViewTerm<T[K], T>, options?: ViewOptions<T, P>) => ViewResult
}

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends PresentationTerms<T, P> {}

    interface State<T, P> extends PresentationState {
      this?: State<T, P>
    }
  }

  interface Meta$<T, P> extends Presentation$<T, P> {}
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
 * A MetaView that can be configured with various options.
 */
export type ConfigurableMetaView <C, T, P = any> = (config: C) => MetaView<T, P>

Meta$.prototype.view = function (viewTerm?, options?) {
  const $ = this as Meta$<any>

  const resetValue$ = <T>($: Meta$<T>) => {
    if (typeof ($.value ?? false) === "object") {
      Object.assign($.value, { $ })
      if (isMeta<T>($.meta)) {
        for (const key of $.childKeys()) {
          resetValue$($.meta[key].$ as Meta$<any>)
        }
      } else if (isMetaArray($.meta)) {
        for (const item of $.meta) {
          resetValue$(item.$)
        }
      }
    }
  }
  resetValue$(this)

  const wrapper = typeof options?.wrapper === "boolean"
    ? options?.wrapper ? viewWrapper : undefined
    : options?.wrapper || viewWrapper
  const resolver = typeof options?.resolver === "boolean"
    ? options?.resolver ? viewResolver : undefined
    : options?.resolver || viewResolver

  viewTerm = viewTerm || $.model.view || $.fn(resolver)
  if (!viewTerm) {
    return ""
  } else if (Array.isArray(viewTerm)) {
    return viewTerm.map((each) => $.view(each))
  } else if (wrapper) {
    return wrapper(viewTerm)($.value, $)
  } else {
    return $.term("hidden") ? "" : viewTerm($.value, $)
  }
}

Meta$.prototype.field = function (key, view?, options?) {
  const $ = this as Meta$<any>
  const field$ = $.child$(key)
  return field$.view(view, options)
}

/**
 * The `renderPage` meta function can be provided to the `review` term from the app policy
 * to produce a global-state single page app.
 */
export const renderPage: MetaFn<any> = (v, $) => {
  document.title = $.term("label")
  render($.view(), document.body)
}

/**
 * A view designed to accept and wrap another view.
 */
export type ViewWrapper<T = any, P = any> = (metaView: MetaView<T, P>) => MetaView<T, P>

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
   * Override or disable (by passing `false`) any default wrapper provided to {@link setViewWrapper}.
   */
  wrapper?: ViewWrapper<T, P> | boolean

  /**
   * Override or disable (by passing `false`) any default resolver assigned to {@link setViewResolver}
   */
  resolver?: ViewResolver | boolean
}
