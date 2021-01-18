import { SplootNode, ParentReference } from "../node";
import { ChildSet, ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, EmptySuggestionGenerator, SuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType } from "../type_registry";
import { SuggestedNode } from "../suggested_node";
import { HighlightColorCategory } from "../../layout/colors";

export const CALL_EXPRESSION = 'CALL_EXPRESSION';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    let sampleNode = new CallExpression(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'call', 'call', true, 'function call');
    return [suggestedNode];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return [];
  }
}

export class CallExpression extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, CALL_EXPRESSION);
    this.addChildSet('callee', ChildSetType.Single, NodeCategory.Expression);
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.Expression);
  }

  getCallee() {
    return this.getChildSet('callee');
  }

  getArguments() {
    return this.getChildSet('arguments');
  }
}

function register() {
  let typeRegistration = new TypeRegistration();
  typeRegistration.typeName = CALL_EXPRESSION;
  typeRegistration.childSets = {'callee': NodeCategory.Expression, 'arguments': NodeCategory.Expression};
  typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
    new LayoutComponent(LayoutComponentType.KEYWORD, 'call'),
    new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'callee'),
    new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'arguments'),
  ]);

  registerType(typeRegistration);
  registerNodeCateogry(CALL_EXPRESSION, NodeCategory.ExpressionToken, new Generator());
}

register();