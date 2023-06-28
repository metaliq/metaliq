/**
 * Container for process-level data, that is used across or outside of individual plugins.
 */
export type ModuleData = {
  imports?: ModuleImport[]

  // The exported view name
  viewName?: string

  model?: ModuleModel
}

/**
 * Details of an import in the generated module.
 */
export type ModuleImport = {
  id: string
  from: string
}

export type ModuleModel = {
  type?: string
  name?: string
  name$?: string
}
