import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeCategory,
  NodeLayout,
  ParentReference,
  SerializedNode,
  SplootNode,
  SuggestedNode,
  SuggestionGenerator,
  TypeRegistration,
  registerAutocompleter,
  registerBlankFillForNodeCategory,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { DecoratorNode, ParseNodeType } from 'structured-pyright'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonFunctionDeclaration } from './python_function'
import { PythonNode } from './python_node'

export const PYTHON_DECORATOR = 'PY_DECORATOR'

export class DecoratorGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const node = new PythonDecorator(null)
    return [new SuggestedNode(node, '@', '@ decorator', true, 'Decorator')]
  }
}

export class DecoratedFunctionGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const decoratorNode = new PythonDecorator(null)
    const funcNode = new PythonFunctionDeclaration(null)
    funcNode.getDecoratorSet().addChild(decoratorNode)
    return [new SuggestedNode(funcNode, '@', '@ decorator', true, 'Decorator')]
  }
}

export class PythonDecorator extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_DECORATOR)
    this.addChildSet('expression', ChildSetType.Immutable, NodeCategory.PythonExpression, 1)
    this.getExpression().addChild(new PythonExpression(null))
  }

  getExpression() {
    return this.getChildSet('expression')
  }

  generateParseTree(parseMapper: ParseMapper): DecoratorNode {
    const expr = this.getExpression().getChild(0) as PythonExpression
    const decorator: DecoratorNode = {
      nodeType: ParseNodeType.Decorator,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      expression: expr.generateParseTree(parseMapper),
    }
    decorator.expression.parent = decorator
    return decorator
  }

  static deserializer(serializedNode: SerializedNode): PythonDecorator {
    const node = new PythonDecorator(null)
    node.deserializeChildSet('expression', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_DECORATOR
    typeRegistration.deserializer = PythonDecorator.deserializer
    typeRegistration.childSets = {
      expression: NodeCategory.PythonExpression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.OPERATOR, [
      new LayoutComponent(LayoutComponentType.KEYWORD, '@'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'expression'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_FUNCTION_DECLARATION: (node: SplootNode) => {
        const funcNode = new PythonFunctionDeclaration(null)
        funcNode.getDecoratorSet().addChild(node)
        return funcNode
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_DECORATOR, NodeCategory.PythonDecorator)

    registerAutocompleter(NodeCategory.PythonDecorator, new DecoratorGenerator())
    registerAutocompleter(NodeCategory.PythonStatementContents, new DecoratedFunctionGenerator())
    registerBlankFillForNodeCategory(NodeCategory.PythonDecorator, () => {
      return new PythonDecorator(null)
    })
  }
}
