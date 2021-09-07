import dedent from "dedent"

export type PageScript = {
  type?: string
  src?: string
  content?: string
}
type PageInfo = {
  title: string
  styles?: string[]
  scripts?: PageScript[]
}
export const page = (info: PageInfo) => dedent`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, user-scalable=yes, initial-scale=1.0, minimum-scale=1.0">
      <title>${info.title}</title>
      ${info.styles.map(style => `<link href="${style}" rel="stylesheet">`).join("\n        ")}
      ${info.scripts?.map(pageScript).join("\n        ")}
    </head>
    <body>
    </body>
  </html>
`
const pageScript = (script: PageScript) => script.content
  ? dedent`
    <script ${ifDefinedAttr(script.type, "type")} ${ifDefinedAttr(script.src, "src")}>
      ${script.content} 
    </script>
  `
  : dedent`
    <script ${ifDefinedAttr(script.type, "type")} ${ifDefinedAttr(script.src, "src")}></script>
  `
const ifDefinedAttr = (value: string, name: string) =>
  value ? `${name}="${value}"` : ""
