import { render, TemplateResult } from "lit"
import { FieldKey, IncludeExclude, isMetaArray, meta$, Meta$, MetaFn, Policy, relink } from "metaliq"

export * from "./tag"

/**
 * Policy registration.
 */
export const PRESENTATION = () => {}

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
   * Calling `$.view(myView)` has several advantages over calling `myView($)`:
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

export type CssClass = string

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

  viewTerm = viewTerm ?? $.model.view ?? resolver?.($)
  let result: ViewResult = ""
  try {
    if (viewTerm) {
      // Enable optional inclusion of terminology policy
      const HIDDEN = "hidden" as keyof Policy.Terms<any>
      if (Array.isArray(viewTerm)) {
        result = viewTerm.flat(99).map((each) => $.view(each, options))
      } else if (!$.term(HIDDEN) || options?.noHide) {
        result = typeof viewTerm === "function" ? viewTerm($) : viewTerm
      }
    }
  } catch (error) {
    // Warn of single view failure rather than halt whole view process
    console.warn(`Failed to render view: ${$.path}`)
    console.error(error)
  }
  return result
}

/**
 * Display the field view (with optional view term and view options) for the given field key.
 *
 * So `$.field("lastName") is the equivalent of `$.$("lastName").view()`.
 */
Meta$.prototype.field = function <T, K extends FieldKey<T>> (
  key: K, view?: MetaViewTerm<T[K], T>, options?: ViewOptions
) {
  return field(key, view, options)(this)
}

/**
 * Obtain a MetaView that renders the given field,
 * optionally with given field view and options.
 *
 * This functionality is wrapped by the Meta$ function {@link Presentation$.field}.
 */
export const field = <T, P, K extends FieldKey<T>> (
  key: K, view?: MetaViewTerm<T[K], T>, options?: ViewOptions
): MetaView<T, P> => $ => {
    const field$ = $.$(key)
    if (!field$) console.warn(`No field() key '${key}'`)
    return field$?.view(view, options)
  }

Meta$.prototype.fields = function (options?) {
  return fields(options)(this)
}

/**
 * Obtain a MetaView that renders child fields,
 * with optional inclusions and exclusions.
 *
 * This functionality is wrapped by the Meta$ function {@link Presentation$.fields}.
 */
export const fields = <T, P = any> (options: FieldsOptions<T> = {}): MetaView<T, P> => $ => {
  return typeof $.value === "object"
    ? $.fieldKeys(options).map(key => $.field(key, options.view, options as ViewOptions))
    : ""
}

/**
 * Repeat each item for an array data / meta value with either
 * a specified view or the item's view from the model.
 */
export const repeat = <T> (itemView?: MetaViewTerm<T extends Array<infer I> ? I : never>): MetaView<T> =>
  $ => {
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
): MetaView<T, P> => $ =>
    condition($) ? $.view(thenView)
      : elseView ? $.view(elseView)
        : ""

/**
 * Return a view that consists of the given text or HTML template,
 * that does not need access to the data.
 */
export const content = (textOrHtml: ViewResult): MetaView<any> => () => textOrHtml

/**
 * The `renderPage` meta function can be used as the `review` term from the app policy
 * to produce a global-state single page app.
 */
export const renderPage: MetaFn<any> = $ => {
  // Enable optional inclusion of terminology policy
  const LABEL = "label" as keyof Policy.Terms<any>
  const newLabel = $.term(LABEL) as string
  if (newLabel) {
    document.title = newLabel
  }
  render($.view(), document.body)
}

/**
 * The `renderElement` meta function can be used as the `review` term when a model view
 * should be rendered in a particular element.
 */
export const renderElement = (selector: string): MetaFn<any> => $ => {
  const el = document.querySelector(selector)
  if (el instanceof HTMLElement) {
    render($.view(), el)
  } else {
    console.warn(`No element found for selector '${selector}'`)
  }
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
export const getViewState = <T = any>(key: string): MetaFn<T> => $ => $.state.view?.[key]

/**
 * Assign an item of transient view state.
 */
export const setViewState = (key: string, value: any): MetaFn<any> => $ => {
  $.state.view = $.state.view || {}
  $.state.view[key] = value
}

/**
 * Perform boolean inversion on an item of transient view state.
 */
export const toggleViewState = (key: string): MetaFn<any> => $ => {
  $.state.view = $.state.view || {}
  $.state.view[key] = !$.state.view[key]
}
