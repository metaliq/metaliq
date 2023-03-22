/**
 * Module providing simple page rendering model.
 */
import { dedent } from "ts-dedent"

export type PageScript = {
  type?: string
  src?: string
  content?: string
  async?: boolean
}

export type PagePreload = {
  href: string
  as?: string
}

export type ThemeColor = string | { light: string, dark: string }

export type PageInfo = {
  title?: string
  preloads?: PagePreload[]
  styles?: string[]
  scripts?: PageScript[]
  body?: string
  baseHref?: string
  favIcon?: string
  themeColor?: ThemeColor
}

export const page = (pageInfo: PageInfo) => dedent`
  <!doctype html>
  <html lang="en">
    <head>
      ${pageInfo.baseHref ? `<base href="${pageInfo.baseHref}"/>` : ""}
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, user-scalable=yes, initial-scale=1.0, minimum-scale=1.0">
      <title>${pageInfo.title}</title>
      ${pageInfo.preloads.map(p => `<link rel="preload" href=${p.href} ${ifDefinedAttr(p.as, "as")}>`).join("\n        ")}
      ${pageInfo.favIcon ? `<link rel="icon" href="${pageInfo.favIcon}">` : ""}
      ${pageInfo.styles.map(style => `<link href="${style}" rel="stylesheet">`).join("\n        ")}
      ${pageInfo.scripts?.map(pageScript).join("\n        ")}
      ${typeof pageInfo.themeColor === "string"
          ? `<meta name="theme-color" content="${pageInfo.themeColor}">`
          : pageInfo.themeColor
            ? dedent`
               <meta name="theme-color" content="${pageInfo.themeColor.light} media="(prefers-color-scheme: light)">
               <meta name="theme-color" content="${pageInfo.themeColor.dark} media="(prefers-color-scheme: dark)">
            ` : ""
      }
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
    <script ${script.async ? "async" : ""} ${ifDefinedAttr(script.type, "type")} ${ifDefinedAttr(script.src, "src")}></script>
  `

const ifDefinedAttr = (value: string, name: string) =>
  value ? `${name}="${value}"` : ""
