import * as recast from "recast";

import { ASTNode } from "ast-types";
import { ChildSetType } from "../childset";
import { ParentReference, SplootNode } from "../node";
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from "../node_category_registry";
import { SuggestedNode } from "../suggested_node";
import { LayoutComponent, LayoutComponentType, NodeLayout, registerType, SerializedNode, TypeRegistration } from "../type_registry";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { ExpressionKind, StatementKind } from "ast-types/gen/kinds";
import { HighlightColorCategory } from "../../layout/colors";
import { isTagValidWithParent } from "../html/tags";
import { HTML_ElEMENT, SplootHtmlElement } from "./html_element";

export const HTML_SCRIPT_ElEMENT = 'HTML_SCRIPT_ELEMENT';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    if (parent.node.type === HTML_ElEMENT) {
      if (isTagValidWithParent("script", (parent.node as SplootHtmlElement).getTag())) {
        return [new SuggestedNode(new SplootHtmlScriptElement(null), "element script", "script javascript", true, "The script element allows authors to include dynamic script and data blocks in their documents.")];
      }
    }
    return [];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class SplootHtmlScriptElement extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, HTML_SCRIPT_ElEMENT);
    this.addChildSet('attributes', ChildSetType.Many, NodeCategory.AttributeNode);
    this.addChildSet('content', ChildSetType.Many, NodeCategory.Statement);
  }

  getAttributes() {
    return this.getChildSet('attributes');
  }

  getContent() {
    return this.getChildSet('content');
  }

  generateJsAst() : ASTNode {
    let statements = [];
    this.getContent().children.forEach((node : SplootNode) => {
      let result = null;
      if (node.type === SPLOOT_EXPRESSION) {
        let expressionNode = node.generateJsAst() as ExpressionKind;
        if (expressionNode !== null) {
          result = recast.types.builders.expressionStatement(expressionNode);
        }
      } else {
        result = node.generateJsAst() as StatementKind;
      }
      if (result !== null) {
        statements.push(result);
      }
    });
    return recast.types.builders.program(statements);    
  }

  clean() {
    this.getContent().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getContent().removeChild(index);
        }
      }
    });
  }

  static deserializer(serializedNode: SerializedNode) : SplootHtmlScriptElement {
    let doc = new SplootHtmlScriptElement(null);
    doc.deserializeChildSet('attributes', serializedNode);
    doc.deserializeChildSet('content', serializedNode);
    return doc;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = HTML_SCRIPT_ElEMENT;
    typeRegistration.deserializer = SplootHtmlScriptElement.deserializer;
    typeRegistration.childSets = {
      'attributes': NodeCategory.AttributeNode,
      'content': NodeCategory.DomNode,
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ELEMENT, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'script'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'attributes'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'content'),
    ]);

    registerType(typeRegistration);
    registerNodeCateogry(HTML_SCRIPT_ElEMENT, NodeCategory.DomNode, new Generator());
  }
}