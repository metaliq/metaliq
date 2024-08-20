import { render, TemplateResult } from "lit"
import { ConfigurableMetaFn, FieldKey, IncludeExclude, isMetaArray, meta$, Meta$, MetaFn, relink } from "metaliq"
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
   * An auxiliary view that some components may support as an alternative to a text label.
   */
  labelView?: MetaViewTerm<T, P>

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
  /**
   * Used to indicate that the field currently has focus.
   */
  active?: boolean

  /**
   * A container for keyed transient view state.
   * An alternative to using module-level maps, web component properties etc.
   * Good for things like whether a dropdown is currently open,
   * but should not be employed for business-related information.
   */
  view?: any
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
   * the {@link MetaViewResolver} assigned via {@link setViewResolver}. This can be overriden
   * or disabled with the {@link ViewOptions.resolver} option.
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
  view: (view?: MetaViewTerm<T, P>, options?: ViewOptions) => ViewResult

  /**
   * Present a view for the given child field, with optionally specified view
   * (otherwise the field model view is used) and options.
   */
  field: <K extends FieldKey<T>> (
    key: K, view?: MetaViewTerm<T[K], T>, options?: ViewOptions
  ) => ViewResult

  /**
   * Present views for the child fields, with optional inclusions or exclusions.
   */
  fields: (options?: FieldsOptions<T>) => ViewResult
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
 * A MetaView that can be configured with various options.
 */
export type ConfigurableMetaView<C, T, P> = ConfigurableMetaFn<C, T, P, ViewResult>

/**
 * A container for other metaviews.
 */
export type ContainerMetaView<T, P> = ConfigurableMetaFn<MetaViewTerm<T, P>, T, P, ViewResult>

export type ConfigurableContainerMetaView<C, T, P> = (config: C) => ContainerMetaView<T, P>

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
export type MetaViewTerm<T, P = any> =
  MetaView<T, P> |
  ViewResult |
  Array<MetaViewTerm<T, P>>

/**
 * The options type for the `$.view()` function.
 */
export type ViewOptions = {
  /**
   * Override or disable (by passing `false`) any default resolver assigned to {@link setViewResolver}
   */
  resolver?: MetaViewResolver | boolean

  /**
   * Override the default behaviour of not displaying hidden fields.
   * This allows for external handling of the `hidden` term,
   * such as filtering items out in a navigator menu whilst still showing them when selected by route,
   * or implementing animated hide/show.
   */
  noHide?: boolean
}

/**
 * Options for the `$.fields` aspect, specifying which fields should be included or excluded.
 */
export type FieldsOptions<T> = ViewOptions & IncludeExclude<T> & {
  view?: MetaView<any>
}

Meta$.prototype.view = function (viewTerm?, options?) {
  const $ = this as Meta$<any>
  relink($)

  const resolver = typeof options?.resolver === "boolean"
    ? options?.resolver ? viewResolver : undefined
    : options?.resolver || viewResolver

  viewTerm = viewTerm ?? $.model.view ?? $.fn(resolver)
  if (!viewTerm) {
    return ""
  } else if (Array.isArray(viewTerm)) {
    return viewTerm.flat(99).map((each) => $.view(each, options))
  } else {
    return (!$.term("hidden") || options?.noHide)
      ? typeof viewTerm === "function" ? viewTerm($.value, $) : viewTerm
      : ""
  }
}

Meta$.prototype.field = function <T, K extends FieldKey<T>> (
  key: K, view?: MetaViewTerm<T[K]>, options?: ViewOptions
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
  key: K, view?: MetaViewTerm<T[K]>, options?: ViewOptions
): MetaView<T> => (v, $) => {
    const field$ = $.field$(key)
    if (!field$) console.warn(`No field() key '${key}'`)
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
export const fields = <T> (options: FieldsOptions<T> = {}): MetaView<T> => (v, $ = meta$(v)) => {
  return typeof v === "object"
    ? $.fieldKeys(options).map(key => $.field(key, options.view, options as ViewOptions))
    : ""
}

/**
 * Repeat each item for an array data / meta value with either
 * a specified view or the item's view from the model.
 */
export const repeat = <T> (itemView?: MetaViewTerm<T extends Array<infer I> ? I : never>): MetaView<T> =>
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
  condition: MetaFn<T, P>,
  thenView: MetaViewTerm<T, P>,
  elseView?: MetaViewTerm<T, P>
): MetaViewTerm<T, P> => (v, $) =>
    condition(v, $) ? $.view(thenView)
      : elseView ? $.view(elseView)
        : ""

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
export type MetaViewWrapper<T = any, P = any> = (metaViewTerm: MetaViewTerm<T, P>) => MetaView<T, P>

/**
 * A function to obtain a MetaView appropriate for the given Meta$.
 */
export type MetaViewResolver<T = any, P = any> = MetaFn<T, P, MetaViewTerm<T, P>>

/**
 * Assign a default viewResolver, for example to determine a default form field given data type.
 */
export const setViewResolver = (resolver: MetaViewResolver) => {
  viewResolver = resolver
}
let viewResolver: MetaViewResolver = null

/**
 * Obtain an item of transient view state.
 */
export const getViewState = (key: string): MetaFn<any> => (v, $) => $.state.view?.[key]

/**
 * Assign an item of transient view state.
 */
export const setViewState = (key: string, value: any): MetaFn<any> => (v, $) => {
  $.state.view = $.state.view || {}
  $.state.view[key] = value
}

/**
 * Perform boolean inversion on an item of transient view state.
 */
export const toggleViewState = (key: string): MetaFn<any> => (v, $) => {
  $.state.view = $.state.view || {}
  $.state.view[key] = !$.state.view[key]
}
