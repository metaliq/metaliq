# @metaliq/metadocs

This module provides a MetaliQ publication target enabling lit-based MetaViews to be generated from documents authored in the Markdown format.

## Usage

A typical setup would be to process documents in a "content" directory and produce MetaView modules within the `src/gen` directory, 
which is then included in downstream compilation of other publication targets (such as `@metaliq/web-page-app`),
but excluded from version control in the default MetaliQ solution template.

```ts
  export const metadocGeneration: MetaModel<any> = {
    label: "Generate MetaViews from MetaDocs",
    publicationTarget: metadoc({
      inDir: "content",
      outDir: ""
    })
  }
```

Such a MetaModel doesn't really need to be based on a specific data type (hence the use of `any`), 
but this approach will be compatible with possible future support for multiple publication targets,
enabling the metadoc stage to be added to a typical web page app MetaModel.
