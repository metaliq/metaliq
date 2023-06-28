import { Plugin } from "unified"
import { visit } from "unist-util-visit"
import { is } from "unist-util-is"
import { html, paragraph, text } from "mdast-builder"
import { Parent } from "unist"
import { as } from "@metaliq/util"

// Check for expression-within-literal syntax
const codeExprEx = /^\$\{/

const divEx = /^\./

export const remarkMetaCode: Plugin = function () {
  return (tree, file) => {
    let tagLevel: number = 0

    visit(tree, (node, index, parent: Parent) => {
      if (is(node, ["code", "inlineCode"])) {
        const code = as<{ value: string }>(node)
        if (code.value.match(codeExprEx)) {
          const textNode = text(code.value)
          const newNode = is(node, "code") ? paragraph(textNode) : textNode
          parent.children.splice(parent.children.indexOf(node), 1, newNode)
        }
      } else if (is(node, "paragraph")) {
        // Extract div nodes from their paragraph
        const children = prop(node, "children")
        const onlyChild = Array.isArray(children) && children.length === 1 && children[0]
        if (onlyChild?.type === "inlineCode" && onlyChild?.value?.match(divEx)) {
          const tags = onlyChild.value.split(" ").filter(Boolean)
          const htmls: string[] = []
          for (const tag of tags) {
            if (tag.match(/^\.*$/)) { // Only dot(s) - closing tag
              const toLevel = tag.length - 1
              while (tagLevel > toLevel) {
                htmls.push("</div>")
                tagLevel--
              }
            } else {
              const parts = tag.split(".").filter(Boolean)
              htmls.push(`<div class="${parts.join(" ")}">`)
              tagLevel++
            }
          }
          const htmlValue = htmls.join("\n")
          const htmlNode = html(htmlValue)
          parent.children.splice(parent.children.indexOf(node), 1, htmlNode)
        }
      }
    })
  }
}

export type LogOptions = {
  filePattern?: RegExp
}

/**
 * Use in processor chain for debugging and development
 */
export const logTree: Plugin<[LogOptions]> = function (options: LogOptions = {}) {
  return (tree, file) => {
    if (!options?.filePattern || file.basename.match(options.filePattern)) {
      visit(tree, (node, index, parent: Parent) => {
        const children = prop(node, "children")
        console.log(`file: ${file.basename}, type: ${node.type}, value: ${prop(node, "text") || prop(node, "value")}, children: ${children?.length || "none"}`)
      })
    }
  }
}

export const prop = (object: any, key: string) => object?.[key]
