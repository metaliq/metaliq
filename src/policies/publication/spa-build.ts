import { join } from "path"
import { MetaSpec } from "../../meta"

export function build (spec: MetaSpec<any>) {
  const somePath = join("one", "two")
  console.log(`Building ${spec.label} with path: ${somePath}`)
}
