import { Meta, metafy, MetaSpec } from "../../meta"
import { startUp, Up } from "./up"
import { renderPage } from "../presentation/view"

export interface AppSpecification<T> {
  init?: Init<T>
  review?: Review
}

export interface AppState<T> {
  up?: Up<Meta<T>>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends AppSpecification<T> {
      this?: Specification<T, P>
    }

    interface State<T, P> extends AppState<T>{
      this?: State<T, P>
    }
  }
}

export type Init<T> = T | (() => T) | (() => Promise<T>)
export type Review = (meta: Meta<any>) => any

export async function run (spec: MetaSpec<any>) {
  // TODO: Make init recursive (or even move to core metafy? but async better here).
  const data = typeof spec.init === "function" ? await spec.init() : spec.init ?? {}
  const meta = metafy(spec, data)
  const review = () => {
    (spec.review || renderPage)(meta)
  }
  await startUp({ review })
  return meta
}
