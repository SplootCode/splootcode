import { HighlightColorCategory } from "../../../layout/colors"
import { ChildSetType } from "../../childset"
import { ParentReference, SplootNode } from "../../node"
import {
  NodeCategory,
  registerNodeCateogry,
  SuggestionGenerator,
} from "../../node_category_registry"
import { SuggestedNode } from "../../suggested_node"
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  registerType,
  SerializedNode,
  TypeRegistration,
} from "../../type_registry"
import { PythonExpression } from "./python_expression"

export const PYTHON_ASSIGNMENT = 'PYTHON_ASSIGNMENT';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let sampleNode = new PythonAssignment(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'set', 'set', true);
    return [suggestedNode];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class PythonAssignment extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_ASSIGNMENT);
    this.addChildSet('left', ChildSetType.Single, NodeCategory.PythonAssignableExpressionToken); // Can only ever be one token
    this.addChildSet('right', ChildSetType.Single, NodeCategory.PythonExpression);
    this.getChildSet('right').addChild(new PythonExpression(null));
  }

  getLeft() {
    return this.getChildSet('left');
  }

  getRight() {
    return this.getChildSet('right');
  }

  static deserializer(serializedNode: SerializedNode) : PythonAssignment {
    let node = new PythonAssignment(null);
    node.deserializeChildSet('left', serializedNode);
    node.getRight().removeChild(0);
    node.deserializeChildSet('right', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = PYTHON_ASSIGNMENT;
    typeRegistration.deserializer = PythonAssignment.deserializer;
    typeRegistration.properties = [];
    typeRegistration.childSets = {
      'left': NodeCategory.Expression,
      'right': NodeCategory.Expression
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE_DECLARATION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'set'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'left'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'right', 'to'),
    ]);

    registerType(typeRegistration);
    registerNodeCateogry(PYTHON_ASSIGNMENT, NodeCategory.PythonStatement, new Generator());
  }
}
