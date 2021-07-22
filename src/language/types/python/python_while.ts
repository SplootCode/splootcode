import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { SuggestedNode } from "../../suggested_node";
import { HighlightColorCategory } from "../../../layout/colors";
import { PythonExpression, PYTHON_EXPRESSION } from "./python_expression";

export const PYTHON_WHILE_LOOP = 'PYTHON_WHILE_LOOP';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let sampleNode = new PythonWhileLoop(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'while', 'while', true);
    return [suggestedNode];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class PythonWhileLoop extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_WHILE_LOOP);
    this.addChildSet('condition', ChildSetType.Single, NodeCategory.PythonExpression);
    this.getChildSet('condition').addChild(new PythonExpression(null));
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement);
    // this.addChildSet('elseblock', ChildSetType.Many, NodeCategory.Statement);
  }

  getCondition() {
    return this.getChildSet('condition');
  }

  getBlock() {
    return this.getChildSet('block');
  }

  clean() {
    this.getBlock().children.forEach((child: SplootNode, index: number) => {
      if (child.type === PYTHON_EXPRESSION) {
        if ((child as PythonExpression).getTokenSet().getCount() === 0) {
          this.getBlock().removeChild(index);
        }
      }
    });
  }

  static deserializer(serializedNode: SerializedNode) : PythonWhileLoop {
    let node = new PythonWhileLoop(null);
    node.getCondition().removeChild(0);
    node.deserializeChildSet('condition', serializedNode);
    node.deserializeChildSet('block', serializedNode);
    return node;
  }

  static register() {
    let ifType = new TypeRegistration();
    ifType.typeName = PYTHON_WHILE_LOOP;
    ifType.deserializer = PythonWhileLoop.deserializer;
    ifType.childSets = {
      'condition': NodeCategory.PythonExpression,
      'block': NodeCategory.PythonStatement,
    };
    ifType.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'while'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'block'),
    ]);
  
    registerType(ifType);
    registerNodeCateogry(PYTHON_WHILE_LOOP, NodeCategory.PythonStatement, new Generator());
  }
}