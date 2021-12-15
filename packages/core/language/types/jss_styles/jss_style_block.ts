import * as recast from 'recast'

import { ChildSetType } from '../../childset'
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from '../html/html_script_element'
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
import { ObjectPropertyKind, StatementKind } from 'ast-types/gen/kinds'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'
import { VariableDefinition } from '../../definitions/loader'

export const JSS_STYLE_BLOCK = 'JSS_STYLE_BLOCK'
export const LOCAL_STYLES_IDENTIFIER = 'jss_local_styles'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new JssStyleBlock(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'style', 'style', true, 'A new style block.')
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class JssStyleBlock extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, JSS_STYLE_BLOCK)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.JssBodyContent)
  }

  getBody() {
    return this.getChildSet('body')
  }

  addSelfToScope() {
    // Need to add LOCAL_STYLES_IDENTIFIER to scope
    // TODO: Hide this from autocomplete (?).
    const varDef: VariableDefinition = {
      name: LOCAL_STYLES_IDENTIFIER,
      deprecated: false,
      type: {
        type: 'object',
        objectProperties: {
          classes: {
            type: 'object',
            objectProperties: {},
          },
        },
      },
      documentation: 'Local style sheet',
    }
    this.getScope().addVariable(varDef)
  }

  generateJsAst(): StatementKind {
    /*
    const sheet = jss.createStyleSheet({
      button: {
        float: 'left'
      }
    }).attach();
    */
    const jss = recast.types.builders.identifier('jss')
    const createStyleSheet = recast.types.builders.identifier('createStyleSheet')
    const member = recast.types.builders.memberExpression(jss, createStyleSheet)

    const properties = this.getBody().children.map((node) => {
      return (node as JavaScriptSplootNode).generateJsAst() as ObjectPropertyKind
    })

    const stylesObject = recast.types.builders.objectExpression(properties)
    const callCreateStyleSheet = recast.types.builders.callExpression(member, [stylesObject])

    // (...).attach()
    const attachFunc = recast.types.builders.memberExpression(
      callCreateStyleSheet,
      recast.types.builders.identifier('attach')
    )
    const callAttach = recast.types.builders.callExpression(attachFunc, [])

    // const sheet = ...
    const identifier = recast.types.builders.identifier(LOCAL_STYLES_IDENTIFIER)
    const declarator = recast.types.builders.variableDeclarator(identifier, callAttach)
    return recast.types.builders.variableDeclaration('const', [declarator])
  }

  static deserializer(serializedNode: SerializedNode): JssStyleBlock {
    const node = new JssStyleBlock(null)
    node.deserializeChildSet('body', serializedNode)
    return node
  }

  static register() {
    const functionType = new TypeRegistration()
    functionType.typeName = JSS_STYLE_BLOCK
    functionType.deserializer = JssStyleBlock.deserializer
    functionType.hasScope = false
    functionType.properties = ['identifier']
    functionType.childSets = { params: NodeCategory.DeclaredIdentifier, body: NodeCategory.JssBodyContent }
    functionType.layout = new NodeLayout(HighlightColorCategory.HTML_ELEMENT, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'private stylesheet'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ])
    functionType.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      const scriptEl = new SplootHtmlScriptElement(null)
      scriptEl.getContent().addChild(node)
      return scriptEl
    }

    registerType(functionType)
    registerNodeCateogry(JSS_STYLE_BLOCK, NodeCategory.Statement, new Generator())
  }
}
