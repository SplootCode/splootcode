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
import { ParentReference, SplootNode } from '../../node'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'
import { SuggestedNode } from '../../suggested_node'
import { sanitizeIdentifier } from './variable_reference'

export const CALL_VARIABLE = 'CALL_VARIABLE'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const scope = parent.node.getScope()
    const suggestions = scope.getAllFunctionDefinitions().map((funcDef: FunctionDefinition) => {
      const funcName = funcDef.name
      const newCall = new CallVariable(null, funcName, funcDef.type.parameters.length)
      let doc = funcDef.documentation
      if (!doc) {
        doc = 'No documentation'
      }
      return new SuggestedNode(newCall, `var ${funcName}`, funcName, true, doc)
    })
    return suggestions
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    const varName = sanitizeIdentifier(textInput)
    const newVar = new CallVariable(null, varName)
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      return []
    }

    const suggestedNode = new SuggestedNode(newVar, `call var ${varName}`, '', false, 'undeclared function')
    return [suggestedNode]
  }
}

export class CallVariable extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string, argCount = 0) {
    super(parentReference, CALL_VARIABLE)
    this.setProperty('identifier', name)
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.Expression)
    for (let i = 0; i < argCount; i++) {
      this.getArguments().addChild(new SplootExpression(null))
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

  static deserializer(serializedNode: SerializedNode): CallVariable {
    const node = new CallVariable(null, serializedNode.properties['identifier'])
    node.deserializeChildSet('arguments', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = CALL_VARIABLE
    typeRegistration.deserializer = CallVariable.deserializer
    typeRegistration.childSets = { arguments: NodeCategory.Expression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(CALL_VARIABLE, NodeCategory.ExpressionToken, new Generator())
  }
}
