import { render, TemplateResult } from "lit"
import { $Fn, $nf, IsMeta, meta$, metaSetups } from "../../meta"
import { label } from "../terminology/terminology"
import { review } from "../application/application"

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
export type MetaView<T, P = any> = $Fn<T, P, any, ViewResult>
export type MetaViewTerm<T, P = any> = MetaView<T, P> | Array<MetaView<T, P>>

metaSetups.push(meta => {
  // Default the review method of the top level spec to renderPage if not assigned and this policy has been loaded
  if (!meta.$.parent) {
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
export const renderPage: $Fn<any> = ({ meta }) => {
  render(view()(meta), document.body)
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
 * Get a ViewResult for the given value or meta object.
 * If the view is not specified, will fall back to the spec view.
 * Calling `view(myView)(myValue, myMeta?)` has several advantages over calling `myView(myValue, myMeta)`:
 *
 * First, it can accommodate either a single view or an array of views - enabling the
 * view term of a meta to accommodate multiple views.
 * Second, it performs a review of all dynamic values on the meta, hidden.
 * Third, it automatically handles dynamic hide / show.
 * Fourth, if provided with only a value it will deduce the meta, except for primitive values.
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
): (hasMeta$: T | IsMeta<T>) => ViewResult {
  return (hasMeta$) => {
    const m = meta$(hasMeta$).meta
    const specView = m.$.spec.view as MetaViewTerm<T>
    if (arguments.length === 0 || primary === true) primary = specView
    if (fallback === true) fallback = specView
    const metaView = (primary || fallback) as MetaViewTerm<T, P>
    if (m.$.parent) review(m) // Don't review on top level, this is auto done in renderPage
    if (!metaView) {
      return ""
    } else if (Array.isArray(metaView)) {
      return metaView.map(mv => view(mv)(m))
    } else {
      if (typeof m.$.spec.hidden === "function") {
        return $nf(hideShowWrapper(metaView))(m)
      } else {
        return m.$.state.hidden ? "" : $nf(metaView)(m)
      }
    }
  }
}
