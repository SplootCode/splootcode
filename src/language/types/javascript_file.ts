import * as recast from "recast";

import { SplootNode, ParentReference } from "../node";
import { ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, EmptySuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../type_registry";
import { ASTNode } from "ast-types";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { ExpressionKind, StatementKind } from "ast-types/gen/kinds";
import { HighlightColorCategory } from "../../layout/colors";

export const JAVASCRIPT_FILE = 'JAVASCRIPT_FILE';

export class JavascriptFile extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, JAVASCRIPT_FILE);
    this.addChildSet('body', ChildSetType.Many, NodeCategory.Statement);
  }

  getBody() {
    return this.getChildSet('body');
  }

  generateJsAst() : ASTNode {
    let statements = [];
    this.getBody().children.forEach((node : SplootNode) => {
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
    this.getBody().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getBody().removeChild(index);
        }
      }
    });
  }

  static deserializer(serializedNode: SerializedNode) : JavascriptFile {
    let jsFile = new JavascriptFile(null);
    jsFile.deserializeChildSet('body', serializedNode);
    return jsFile;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = JAVASCRIPT_FILE;
    typeRegistration.deserializer = JavascriptFile.deserializer;
    typeRegistration.properties = [];
    typeRegistration.childSets = {'body': NodeCategory.Statement};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.NONE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ]);

    registerType(typeRegistration);
    registerNodeCateogry(JAVASCRIPT_FILE, NodeCategory.Statement, new EmptySuggestionGenerator());
  }
}