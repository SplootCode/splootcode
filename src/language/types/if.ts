import * as recast from "recast";

import { SplootNode, ParentReference } from "../node";
import { ChildSet, ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, EmptySuggestionGenerator, SuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../type_registry";
import { SuggestedNode } from "../suggested_node";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { ASTNode } from "ast-types";
import { ExpressionKind } from "ast-types/gen/kinds";
import { HighlightColorCategory } from "../../layout/colors";

export const IF_STATEMENT = 'IF_STATEMENT';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let sampleNode = new IfStatement(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'if', 'if', true);
    return [suggestedNode];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };

}

export class IfStatement extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, IF_STATEMENT);
    this.addChildSet('condition', ChildSetType.Single, NodeCategory.Expression);
    this.getChildSet('condition').addChild(new SplootExpression(null));
    this.addChildSet('trueblock', ChildSetType.Many, NodeCategory.Statement);
    this.addChildSet('elseblock', ChildSetType.Many, NodeCategory.Statement);
  }

  getCondition() {
    return this.getChildSet('condition');
  }

  getTrueBlock() {
    return this.getChildSet('trueblock');
  }

  getElseBlock() {
    return this.getChildSet('elseblock');
  }

  clean() {
    this.getTrueBlock().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getTrueBlock().removeChild(index);
        }
      }
    });
    this.getElseBlock().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getElseBlock().removeChild(index);
        }
      }
    });
  }

  generateJsAst() : ASTNode {
    let test = this.getCondition().getChild(0).generateJsAst() as ExpressionKind;
    let statements = [];
    this.getTrueBlock().children.forEach((node: SplootNode) => {
      let ast = node.generateJsAst();
      if (node.type === SPLOOT_EXPRESSION) {
        ast = recast.types.builders.expressionStatement(ast as ExpressionKind);
      }
      statements.push(ast);
    });
    let consequent = recast.types.builders.blockStatement(statements);
    return recast.types.builders.ifStatement(test, consequent);
  }

  static deserializer(serializedNode: SerializedNode) : IfStatement {
    let node = new IfStatement(null);
    node.getCondition().removeChild(0);
    node.deserializeChildSet('condition', serializedNode);
    node.deserializeChildSet('trueblock', serializedNode);
    node.deserializeChildSet('elseblock', serializedNode);
    return node;
  }

  static register() {
    let ifType = new TypeRegistration();
    ifType.typeName = IF_STATEMENT;
    ifType.deserializer = IfStatement.deserializer;
    ifType.childSets = {
      'condition': NodeCategory.Expression,
      'trueblock': NodeCategory.Statement,
      'elseblock': NodeCategory.Statement
    };
    ifType.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'if'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'trueblock'),
    ]);
  
    registerType(ifType);
    registerNodeCateogry(IF_STATEMENT, NodeCategory.Statement, new Generator());
  }
}