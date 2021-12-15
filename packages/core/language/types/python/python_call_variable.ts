import * as recast from 'recast'

import { CallExpressionKind, ExpressionKind } from 'ast-types/gen/kinds'
import { ChildSetType } from '../../childset'
import { FunctionDefinition } from '../../definitions/loader'
import { HighlightColorCategory } from '../../../colors'
import { JavaScriptSplootNode } from '../../javascript_node'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from '../../node_category_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'
import { sanitizeIdentifier } from './../js/variable_reference'

export const PYTHON_CALL_VARIABLE = 'PYTHON_CALL_VARIABLE'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const scope = parent.node.getScope()
    const suggestions = scope.getAllFunctionDefinitions().map((funcDef: FunctionDefinition) => {
      const funcName = funcDef.name
      const argCount = funcDef.type?.parameters?.length || 1
      const newCall = new PythonCallVariable(null, funcName, argCount)
      let doc = funcDef.documentation
      if (!doc) {
        doc = ''
      }
      return new SuggestedNode(newCall, `call ${funcName}`, funcName, true, doc)
    })
    return suggestions
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    const varName = sanitizeIdentifier(textInput)
    const newVar = new PythonCallVariable(null, varName, 1)
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      return []
    }

    const suggestedNode = new SuggestedNode(newVar, `call var ${varName}`, '', false, 'undeclared function')
    return [suggestedNode]
  }
}

export class PythonCallVariable extends SplootNode {
  constructor(parentReference: ParentReference, name: string, argCount = 0) {
    super(parentReference, PYTHON_CALL_VARIABLE)
    this.setProperty('identifier', name)
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.PythonExpression)
    for (let i = 0; i < argCount; i++) {
      this.getArguments().addChild(new PythonExpression(null))
    }
  }

  getArguments() {
    return this.getChildSet('arguments')
  }

  getIdentifier() {
    return this.properties.identifier
  }

  setIdentifier(identifier: string) {
    this.properties.identifiter = identifier
  }

  generateJsAst(): CallExpressionKind {
    const identifier = recast.types.builders.identifier(this.getIdentifier())
    const args = this.getArguments().children.map((argNode: JavaScriptSplootNode) => {
      return argNode.generateJsAst() as ExpressionKind
    })
    const call = recast.types.builders.callExpression(identifier, args)
    return call
  }

  clean() {
    const numArgs = this.getArguments().children.length
    this.getArguments().children.forEach((child: SplootNode, index: number) => {
      // Don't remove the first argument - leave the brackets there.
      if (!(index == 0 && numArgs == 1) && child.type === PYTHON_EXPRESSION) {
        if ((child as PythonExpression).getTokenSet().getCount() === 0) {
          this.getArguments().removeChild(index)
        }
      }
    })
  }

  getArgumentNames(): string[] {
    const scope = this.getScope()
    if (!scope) {
      return []
    }
    const funcDef = scope.getFunctionDefinitionByName(this.getIdentifier())
    if (!funcDef) {
      return []
    }
    const res = funcDef.type.parameters.map((param) => param.name)
    return res
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments', this.getArgumentNames()),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): PythonCallVariable {
    const node = new PythonCallVariable(null, serializedNode.properties['identifier'])
    node.deserializeChildSet('arguments', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_CALL_VARIABLE
    typeRegistration.deserializer = PythonCallVariable.deserializer
    typeRegistration.childSets = { arguments: NodeCategory.PythonExpression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_CALL_VARIABLE, NodeCategory.PythonExpressionToken, new Generator())
  }
}
