import { HighlightColorCategory } from "../../../layout/colors"
import { SingleStatementData, StatementCapture } from "../../capture/runtime_capture"
import { ChildSetType } from "../../childset"
import { NodeMutation, NodeMutationType } from "../../mutations/node_mutations"
import { ParentReference, SplootNode } from "../../node"
import {
  getAutocompleteFunctionsForCategory,
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
import { formatPythonData } from "./utils"

export const PYTHON_EXPRESSION = 'PYTHON_EXPRESSION';


class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    // Get all static expression tokens available and wrap them in an expression node.
    let suggestionGeneratorSet = getAutocompleteFunctionsForCategory(NodeCategory.PythonExpressionToken);
    let staticSuggestions = [] as SuggestedNode[];
    suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
      let expressionSuggestions = generator.staticSuggestions(parent, index).map((tokenNodeSuggestion: SuggestedNode) => {
        let expressionNode = new PythonExpression(null);
        expressionNode.getTokenSet().addChild(tokenNodeSuggestion.node);
        tokenNodeSuggestion.node = expressionNode;
        return tokenNodeSuggestion;
      });
      staticSuggestions = staticSuggestions.concat(expressionSuggestions)
    })
    return staticSuggestions;
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    let suggestionGeneratorSet = getAutocompleteFunctionsForCategory(NodeCategory.PythonExpressionToken);
    let staticSuggestions = [] as SuggestedNode[];
    suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
      let expressionSuggestions = generator.dynamicSuggestions(parent, index, textInput).map((tokenNodeSuggestion: SuggestedNode) => {
        let expressionNode = new PythonExpression(null);
        expressionNode.getTokenSet().addChild(tokenNodeSuggestion.node);
        tokenNodeSuggestion.node = expressionNode;
        return tokenNodeSuggestion;
      });
      staticSuggestions = staticSuggestions.concat(expressionSuggestions)
    })
    return staticSuggestions;
  };
}

export class PythonExpression extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_EXPRESSION);
    this.addChildSet('tokens', ChildSetType.Many , NodeCategory.PythonExpressionToken);
  }

  getTokenSet() {
    return this.getChildSet('tokens');
  }

  clean() {
    // If this expression is now empty, call `clean` on the parent.
    // If the parent doesn't allow empty expressions, it'll delete it.
    if (this.getTokenSet().getCount() === 0) {
      this.parent.node.clean();
    }
  }

  static deserializer(serializedNode: SerializedNode) : PythonExpression {
    let res = new PythonExpression(null);
    res.deserializeChildSet('tokens', serializedNode);
    return res;
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture) {
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`);
    }
    const data = capture.data as SingleStatementData;
    const annotation = [];
    if (capture.sideEffects.length > 0) {
      const stdout = capture.sideEffects
        .filter(sideEffect => sideEffect.type === 'stdout')
        .map(sideEffect => sideEffect.value).join('').replace('\n', '')
      annotation.push(`prints "${stdout}"`);
    }
    if (annotation.length == 0 || data.resultType != 'NoneType') {
      annotation.push(`→ ${formatPythonData(data.result, data.resultType)}`)
    }
    let mutation = new NodeMutation();
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATION;
    mutation.annotationValue = annotation;
    this.fireMutation(mutation);
    return;
  }
  
  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = PYTHON_EXPRESSION;
    typeRegistration.deserializer = PythonExpression.deserializer;
    typeRegistration.properties = ['tokens'];
    typeRegistration.childSets = {'tokens': NodeCategory.PythonExpressionToken};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.NONE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'tokens'),    
    ]);

  
    registerType(typeRegistration);
    // When needed create the expression while autocompleting the expresison token.
    registerNodeCateogry(PYTHON_EXPRESSION, NodeCategory.PythonStatement, new Generator());
    registerNodeCateogry(PYTHON_EXPRESSION, NodeCategory.PythonExpression, new Generator());
  }
}