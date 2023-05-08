import { render, TemplateResult } from "lit"
import { FieldKey, fieldKeys, IncludeExclude, isMeta, isMetaArray, meta$, Meta$, MetaFn } from "metaliq"
import { PUBLICATION } from "@metaliq/publication"
import { APPLICATION } from "@metaliq/application"
import { TERMINOLOGY } from "@metaliq/terminology"
import { VALIDATION } from "@metaliq/validation"

export * from "./tag"

/**
 * Policy registration.
 */
export const PRESENTATION = () => {}
PUBLICATION()
APPLICATION()
TERMINOLOGY()
VALIDATION()

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
   * Present a view for the given child field, with optionally specified view
   * (otherwise the field model view is used) and options.
   */
  field: <K extends FieldKey<T>> (
    key: K, view?: MetaViewTerm<T[K], T>, options?: ViewOptions<T[K], T>
  ) => ViewResult

  /**
   * Present views for the child fields, with optional inclusions or exclusions.
   */
  fields: <T> (options?: FieldsOptions<T>) => ViewResult
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

/**
 * The options type for the `$.view()` function.
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

/**
 * Options for the `$.fields` aspect, specifying which fields should be included or excluded.
 */
export type FieldsOptions<T> = ViewOptions<T> & IncludeExclude<T>

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

Meta$.prototype.field = function <T, K extends FieldKey<T>> (
  key: K, view?: MetaViewTerm<T[K]>, options?: ViewOptions<T[K]>
) {
  return field(key, view, options)(this.value, this)
}

/**
 * Obtain a MetaView that renders the given field,
 * optionally with given field view and options.
 *
 * This functionality is wrapped by the Meta$ function {@link Presentation$.field}.
 */
export const field = <T, K extends FieldKey<T>> (
  key: K, view?: MetaViewTerm<T[K]>, options?: ViewOptions<T[K]>
): MetaView<T> => (v, $) => {
    const field$ = $.child$(key)
    return field$?.view(view, options)
  }

Meta$.prototype.fields = function (options?) {
  return fields(options)(this.value, this)
}

/**
 * Obtain a MetaView that renders child fields,
 * with optional inclusions and exclusions.
 *
 * This functionality is wrapped by the Meta$ function {@link Presentation$.fields}.
 */
export const fields = <T> (options?: FieldsOptions<T>): MetaView<T> => (v, $ = meta$(v)) => {
  return typeof v === "object"
    ? fieldKeys($.model, options).map(key => $.field(key, null, options as ViewOptions<any>))
    : ""
}

/**
 * Repeat each item for an array data / meta value with either
 * a specified view or the item's view from the model.
 */
export const repeat = <T, MI extends (
  T extends Array<infer I> ? MetaViewTerm<I> : never
)> (itemView?: MI): MetaView<T> =>
    (v, $) => {
      if (isMetaArray($.meta)) {
        return $.meta.map(({ $ }) => $.view(itemView))
      } else return ""
    }

/**
 * Conditional display field.
 * If the condition is met, the `then` view is shown.
 * Optionally an `else` view can be specified to show if condition not met.
 */
export const ifThen = <T, P = any> (
  condition: MetaFn<T, P, boolean>,
  thenView: MetaView<T, P>,
  elseView?: MetaView<T, P>
): MetaView<T, P> => (v, m) => condition(v, m) ? thenView(v, m) : elseView?.(v, m) ?? ""

/**
 * Return a view that consists of the given text or HTML template,
 * that does not need access to the data.
 */
export const content = (textOrHtml: ViewResult): MetaView<any> => () => textOrHtml

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
 * Assign a default view wrapper, for example to always do animation for dynamic hide-show fields.
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
