/**
 * Module providing simple page rendering model.
 */
import dedent from "ts-dedent"

export type PageScript = {
  type?: string
  src?: string
  content?: string
}

export type PageInfo = {
  title?: string
  styles?: string[]
  scripts?: PageScript[]
  body?: string
  baseHref?: string
}

export const page = (pageInfo: PageInfo) => dedent`
  <!doctype html>
  <html lang="en">
    <head>
      ${pageInfo.baseHref ? `<base href="${pageInfo.baseHref}"/>` : ""}
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, user-scalable=yes, initial-scale=1.0, minimum-scale=1.0">
      <title>${pageInfo.title}</title>
      ${pageInfo.styles.map(style => `<link href="${style}" rel="stylesheet">`).join("\n        ")}
      ${pageInfo.scripts?.map(pageScript).join("\n        ")}
    </head>
    <body>
      ${pageInfo.body || ""}
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
