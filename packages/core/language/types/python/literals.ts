import { HighlightColorCategory } from "../../../colors";
import { ParentReference, SplootNode } from "../../node";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { SuggestedNode } from "../../suggested_node";
import { LayoutComponent, LayoutComponentType, NodeLayout, registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { PythonExpression, PYTHON_EXPRESSION } from "./python_expression";

export const PYTHON_NONE = 'PYTHON_NONE';
export const PYTHON_BOOL = 'PYTHON_BOOL';

class PythonNoneGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [new SuggestedNode(new NoneLiteral(null), 'none', 'null', true, 'None')];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return [];
  }
}

export class NoneLiteral extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_NONE);
    this.properties = {};
  }

  static deserializer(serializedNode: SerializedNode) : NoneLiteral {
    return new NoneLiteral(null);
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = PYTHON_NONE;
    typeRegistration.deserializer = NoneLiteral.deserializer;
    typeRegistration.properties = [];
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'None'),
    ]);
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      let exp = new PythonExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
    registerType(typeRegistration);
    registerNodeCateogry(PYTHON_NONE, NodeCategory.PythonExpressionToken, new PythonNoneGenerator());
  }
}

class PythonBoolGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [
      new SuggestedNode(new PythonBool(null, true), 'True', 'true', true, 'True'),
      new SuggestedNode(new PythonBool(null, false), 'False', 'false', true, 'False')
    ];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return [];
  }
}

export class PythonBool extends SplootNode {
  constructor(parentReference: ParentReference, value: boolean) {
    super(parentReference, PYTHON_BOOL);
    this.setProperty('value', value);
  }

  static deserializer(serializedNode: SerializedNode) : NoneLiteral {
    const val = serializedNode.properties['value'];
    return new PythonBool(null, !!val);
  }

  getValue() : boolean {
    return this.getProperty('value');
  }

  getNodeLayout() {
    const val = this.getValue() ? 'True': 'False';
    return new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, val),
    ], false)
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = PYTHON_BOOL;
    typeRegistration.deserializer = PythonBool.deserializer;
    typeRegistration.properties = ['value'];
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'value'),
    ]);
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      let exp = new PythonExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
    registerType(typeRegistration);
    registerNodeCateogry(PYTHON_BOOL, NodeCategory.PythonExpressionToken, new PythonBoolGenerator());
  }
}
