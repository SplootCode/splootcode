import * as recast from "recast";

import { SplootNode, ParentReference } from "../node";
import { ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../type_registry";
import { ArrayExpressionKind, ExpressionKind } from "ast-types/gen/kinds";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { HighlightColorCategory } from "../../layout/colors";
import { SuggestedNode } from "../suggested_node";

export const LIST_EXPRESSION = 'LIST_EXPRESSION';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [
      new SuggestedNode(new ListExpression(null), 'list', 'list array', true),
    ];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return [];
  }
}

export class ListExpression extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, LIST_EXPRESSION);
    this.addChildSet('values', ChildSetType.Many, NodeCategory.Expression);
  }

  getValues() {
    return this.getChildSet('values');
  }

  generateJsAst() : ArrayExpressionKind{
    let values = this.getValues().children.map((argNode: SplootNode) => {
      return argNode.generateJsAst() as ExpressionKind;
    })
    let listInit = recast.types.builders.arrayExpression(values);
    return listInit;
  }

  clean() {
    this.getValues().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getValues().removeChild(index);
        }
      }
    });
  }

  getArgumentNames() : string[] {
    // Generate an array ['0', '1', '2', ...] for the number of list items.
    let count = this.getValues().getCount();
    return Array.from(Array(count).keys()).map(v => v.toString());
  }

  getNodeLayout() : NodeLayout {
    let layout = new NodeLayout(HighlightColorCategory.LITERAL_LIST, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'list'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'values', this.getArgumentNames()),
    ])
    return layout;
  }

  static deserializer(serializedNode: SerializedNode) : ListExpression {
    let node = new ListExpression(null);
    node.deserializeChildSet('values', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = LIST_EXPRESSION;
    typeRegistration.deserializer = ListExpression.deserializer;
    typeRegistration.childSets = {'values': NodeCategory.Expression};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.LITERAL_LIST, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'list'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'values'),
    ]);
  
    registerType(typeRegistration);
    registerNodeCateogry(LIST_EXPRESSION, NodeCategory.ExpressionToken, new Generator());
  }
}