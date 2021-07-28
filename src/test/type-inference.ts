import { FieldKey, Meta, metafy, MetaSpec } from "../meta"

import { TerminologySpec } from "../policies/terminology/terminology"
import { AppSpecification } from "../policies/transition/app"

/**
 * A collection of tests for type inference.
 * These are not so much runtime tests as tests for type inference during compilation.
 * Running this test is `tsc` and check for compiler errors.
 */

/**
 * Establish typesafe key lookup on Meta.
 */
export function keyTest <T> (meta: Meta<T>, key: FieldKey<T>) {
  return meta[key]
}

type TestType = {
  a?: number
  b?: number
  c?: number
}

type TestProcs = {
  calculate: (tt: Meta<TestType>) => void
}

export const testProcs: TestProcs = {
  calculate (tt) {
    tt.c.$.value = tt.a.$.value + tt.b.$.value
  }
}

const testPresentationSpec: TerminologySpec = {
  label: "Test"
}

const testAppSpec: AppSpecification<TestType> = {
  init: {
    a: 1,
    b: 2
  }
}

const testSpec: MetaSpec<TestType, any> = {
  ...testPresentationSpec,
  ...testAppSpec,
  fields: {
    a: {
      label: "A"
    }
  }
}

export function procTest () {
  const meta: Meta<TestType> =
    metafy(testSpec, <TestType>testAppSpec.init, null)
  console.log(meta.c.$.value)
}
