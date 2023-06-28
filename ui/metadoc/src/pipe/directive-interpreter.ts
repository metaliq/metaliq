import { Plugin, Processor } from "unified"
import { visit } from "unist-util-visit"
import { Directive } from "mdast-util-directive"
import { h } from "hastscript"
import { Parent } from "unist"

export const directiveInterpreter: Plugin = function (this: Processor) {
  return (root, file) => {
    visit(root, (node, index, parent: Parent) => {
      if (["textDirective", "leafDirective", "containerDirective"].includes(node.type)) {
        const directive = node as Directive

        const data = directive.data || (directive.data = {})
        const hast = h(directive.name || "div", directive.attributes)

        data.hName = hast.tagName
        data.hProperties = hast.properties
      }
    })
  }
}
