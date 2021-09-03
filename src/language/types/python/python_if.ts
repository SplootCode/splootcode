import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { SuggestedNode } from "../../suggested_node";
import { HighlightColorCategory } from "../../../layout/colors";
import { PythonExpression, PYTHON_EXPRESSION } from "./python_expression";
import { IfStatementData, SingleStatementData, StatementCapture } from "../../capture/runtime_capture";
import { NodeMutation, NodeMutationType } from "../../mutations/node_mutations";
import { formatPythonData } from "./utils";

export const PYTHON_IF_STATEMENT = 'PYTHON_IF_STATEMENT';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let sampleNode = new PythonIfStatement(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'if', 'if', true);
    return [suggestedNode];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class PythonIfStatement extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_IF_STATEMENT);
    this.addChildSet('condition', ChildSetType.Single, NodeCategory.PythonExpression);
    this.getChildSet('condition').addChild(new PythonExpression(null));
    this.addChildSet('trueblock', ChildSetType.Many, NodeCategory.PythonStatement);
    // this.addChildSet('elseblock', ChildSetType.Many, NodeCategory.Statement);
  }

  getCondition() {
    return this.getChildSet('condition');
  }

  getTrueBlock() {
    return this.getChildSet('trueblock');
  }

  // getElseBlock() {
  //   return this.getChildSet('elseblock');
  // }

  clean() {
    this.getTrueBlock().children.forEach((child: SplootNode, index: number) => {
      if (child.type === PYTHON_EXPRESSION) {
        if ((child as PythonExpression).getTokenSet().getCount() === 0) {
          this.getTrueBlock().removeChild(index);
        }
      }
    });
    // this.getElseBlock().children.forEach((child: SplootNode, index: number) => {
    //   if (child.type === PYTHON_EXPRESSION) {
    //     if ((child as PythonExpression).getTokenSet().getCount() === 0) {
    //       this.getElseBlock().removeChild(index);
    //     }
    //   }
    // });
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture) {
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`);
    }
    const data = capture.data as IfStatementData;
    const condition = data.condition[0]
    const conditionData = condition.data as SingleStatementData;

    const annotation = [];
    if (condition.sideEffects.length > 0) {
      const stdout = condition.sideEffects
        .filter(sideEffect => sideEffect.type === 'stdout')
        .map(sideEffect => sideEffect.value).join('')
      annotation.push(`prints "${stdout}"`);
    }
    annotation.push(`→ ${formatPythonData(conditionData.result, conditionData.resultType)}`)
    let mutation = new NodeMutation();
      mutation.node = this
      mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATION;
      mutation.annotationValue = annotation;
    this.fireMutation(mutation);

    if (data.trueblock) {
      const trueBlockChildren = this.getTrueBlock().children;
      const trueBlockData = data.trueblock;
      let i = 0;
      for (; i < trueBlockData.length; i++) {
        trueBlockChildren[i].recursivelyApplyRuntimeCapture(trueBlockData[i]);
      }
      if (i < trueBlockChildren.length) {
        for (; i < trueBlockChildren.length; i++) {
          trueBlockChildren[i].recursivelyClearRuntimeCapture();
        }
      }
    }
  }

  recursivelyClearRuntimeCapture() {
    let mutation = new NodeMutation();
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATION;
    mutation.annotationValue = [];
    this.fireMutation(mutation);
    let blockChildren = this.getTrueBlock().children;
    for (let i = 0; i < blockChildren.length; i++) {
      blockChildren[i].recursivelyClearRuntimeCapture();
    }
  }


  static deserializer(serializedNode: SerializedNode) : PythonIfStatement {
    let node = new PythonIfStatement(null);
    node.getCondition().removeChild(0);
    node.deserializeChildSet('condition', serializedNode);
    node.deserializeChildSet('trueblock', serializedNode);
    //node.deserializeChildSet('elseblock', serializedNode);
    return node;
  }

  static register() {
    let ifType = new TypeRegistration();
    ifType.typeName = PYTHON_IF_STATEMENT;
    ifType.deserializer = PythonIfStatement.deserializer;
    ifType.childSets = {
      'condition': NodeCategory.PythonExpression,
      'trueblock': NodeCategory.PythonStatement,
    //  'elseblock': NodeCategory.Statement
    };
    ifType.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'if'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'trueblock'),
    ]);
  
    registerType(ifType);
    registerNodeCateogry(PYTHON_IF_STATEMENT, NodeCategory.PythonStatement, new Generator());
  }
}