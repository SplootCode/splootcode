import { SplootNode, ParentReference } from "../../node";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponent, LayoutComponentType, registerType, NodeAttachmentLocation, SerializedNode } from "../../type_registry";
import { SuggestedNode } from "../../suggested_node";
import { HighlightColorCategory } from "../../../colors";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { JavaScriptSplootNode } from "../../javascript_node";

export const BINARY_OPERATOR = 'BINARY_OPERATOR';

/*
16 member	. []
15 call / create instance	() new
14 negation/increment	! ~ - + ++ -- typeof void delete
13 multiply/divide	* / %
12 addition/subtraction	+ -
11 bitwise shift	<< >> >>>
10 relational	< <= > >= in instanceof
9 equality	== != === !==
8 bitwise-and	&
7 bitwise-xor	^
6 bitwise-or	|
5 logical-and	&&
4 logical-or	||
3 conditional	?:
2 assignment	= += -= *= /= %= <<= >>= >>>= &= ^= |= &&= ||= ??=
1 comma	,
*/


const OPERATORS = {
  '*': {display: '×', precedence: 130, key: '*', searchTerms: ['times', 'multiply', 'x'], description: 'multiply'},
  '+': {display: '+', precedence: 120, key: '+', searchTerms: ['add', 'plus'], description: 'add'},
  '-': {display: '-', precedence: 120, key: '-', searchTerms: ['minus', 'subtract']}, description: 'minus',
  '/': {display: '÷', precedence: 130, key: '/', searchTerms: ['divide', 'divided by', 'division'], description: 'divide'},
  '%': {display: 'mod', precedence: 130, key: '%', searchTerms: ['remainder', 'mod', 'modulus'], description: 'remainder (modulus)'},
  '===': {display: '=', precedence: 90, key: '===', searchTerms: ['equals', 'equal', '=='], description: 'is equal to'},
  '!==': {display: '≠', precedence: 90, key: '!==', searchTerms: ['not equals', 'equal', '!='], description: 'is not equal to'},
  '&&': {display: 'and', precedence: 50, key: '&&', searchTerms: ['and'], description: 'AND'},
  '||': {display: 'or', precedence: 40, key: '||', searchTerms: ['or'], description: 'OR'},
  '|': {display: 'bitwise-or', precedence: 60, key: '|', searchTerms: ['bitwise OR'], description: 'bitwise OR'},
  '&': {display: 'bitwise-and', precedence: 80, key: '&', searchTerms: ['bitwise AND'], description: 'bitwise AND'},
  '<': {display: '<', precedence: 100, key: '<', searchTerms: ['less than'], description: 'is less than'},
  '<=': {display: '≤', precedence: 100, key: '<=', searchTerms: ['less than equal'], description: 'is less than or equal to'},
  '>': {display: '>', precedence: 100, key: '>', searchTerms: ['greater than'], description: 'is greater than'},
  '>=': {display: '≥', precedence: 100, key: '>=', searchTerms: ['greater than equal'], description: 'is greater than or equal to'},
}

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let results = [];
    for (let operator in OPERATORS) {
      let info = OPERATORS[operator];
      let node = new BinaryOperator(null, operator);
      results.push(new SuggestedNode(node, info.key, info.searchTerms, true, info.description));
    }
    return results;
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class BinaryOperator extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, operator: string) {
    super(parentReference, BINARY_OPERATOR);
    this.setProperty('operator', operator);
  }

  setOperator(operator: string) {
    this.setProperty('operator', operator);
  }

  getOperator() {
    return this.getProperty('operator');
  }

  getPrecedence() : number {
    return OPERATORS[this.getOperator()].precedence;
  }

  static deserializer(serializedNode: SerializedNode) : BinaryOperator {
    let node = new BinaryOperator(null, serializedNode.properties.operator);
    return node;
  }

  getNodeLayout() {
    return new NodeLayout(HighlightColorCategory.OPERATOR, [
      new LayoutComponent(LayoutComponentType.KEYWORD, OPERATORS[this.getOperator()].display),
    ], true)
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = BINARY_OPERATOR;
    typeRegistration.deserializer = BinaryOperator.deserializer;
    typeRegistration.properties = ['operator'];
    typeRegistration.childSets = {};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.OPERATOR, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'operator'),
    ], true);
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      let exp = new SplootExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
  
    registerType(typeRegistration);
    registerNodeCateogry(BINARY_OPERATOR, NodeCategory.ExpressionToken, new Generator()); 
  }
}