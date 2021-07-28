import { TemplateResult, render } from "lit"
import { Meta } from "../../meta"

export interface ViewSpecification<T, P> {
  view?: View<T, P>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends ViewSpecification<T, P> {}
  }
}

/**
 * A view function takes a meta-object and returns a template result.
 */
export type View<T, P = any> = (meta: Meta<T, P>) => ViewResult
export type SingularResult = TemplateResult | string
export type ViewResult = SingularResult | ViewResult[]

/**
 * A widget takes some configuration and returns a View.
 */
export type Widget<T, P = any> = (...params: any[]) => View<T, P>

/**
 * The renderPage function, if specified as the review property from the app policy,
 * produces a global-state single page app.
 */
export const renderPage = (meta: Meta<any>) => {
  render(meta.$.spec.view(meta), document.body)
}
