import { Meta, metafy, MetaSpec } from "../../meta"
import { startUp, Up } from "../transition/up"
import { renderPage } from "../presentation/presentation"
import { initRoutes } from "../navigation/navigation"

export interface ApplicationSpec<T> {
  init?: Init<T>
  review?: Review
}

export interface AppState<T> {
  up?: Up<Meta<T>>
}

declare module "../../policy" {
  namespace Policy {
    interface Specification<T, P> extends ApplicationSpec<T> {
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
  if (spec.routes) { // TODO: Recursive search for routes on inner spec?
    initRoutes()
  }
  return meta
}
