import { HighlightColorCategory } from "../../../colors"
import { getSideEffectAnnotations, NodeAnnotation, NodeAnnotationType } from "../../annotations/annotations"
import { SingleStatementData, StatementCapture } from "../../capture/runtime_capture"
import { ChildSetType } from "../../childset"
import { VariableDefinition } from "../../definitions/loader"
import { NodeMutation, NodeMutationType } from "../../mutations/node_mutations"
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
import { PythonDeclaredIdentifier, PYTHON_DECLARED_IDENTIFIER } from "./declared_identifier"
import { PythonExpression } from "./python_expression"
import { formatPythonData } from "./utils"

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

  addSelfToScope() {
    let identifierChildSet = this.getLeft();
    if (identifierChildSet.getCount() === 1 && identifierChildSet.getChild(0).type === PYTHON_DECLARED_IDENTIFIER) {
      this.getScope().addVariable({
        name: (this.getLeft().getChild(0) as PythonDeclaredIdentifier).getName(),
        deprecated: false,
        documentation: 'Variable',
        type: {type: 'any'},
      } as VariableDefinition);
    }
  }

  getLeftAsString() : string {
    let identifierChildSet = this.getLeft();
    if (identifierChildSet.getCount() === 1 && identifierChildSet.getChild(0).type === PYTHON_DECLARED_IDENTIFIER) {
      return (this.getLeft().getChild(0) as PythonDeclaredIdentifier).getName();
    }
    return '';
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture) {
    if (capture.type == 'EXCEPTION') {
      this.applyRuntimeError(capture);
      return 
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`);
    }
    
    const annotations : NodeAnnotation[] = getSideEffectAnnotations(capture);
    const data = capture.data as SingleStatementData;
    annotations.push({
      type: NodeAnnotationType.Assignment,
      value: {
        variableName: this.getLeftAsString(),
        type: data.resultType,
        value: data.result,
      }
    });
    let mutation = new NodeMutation();
      mutation.node = this
      mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS;
      mutation.annotations = annotations;
    this.fireMutation(mutation);
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
      'left': NodeCategory.PythonAssignableExpressionToken,
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
