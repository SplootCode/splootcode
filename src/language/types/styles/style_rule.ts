import { HighlightColorCategory } from "../../../layout/colors";
import { ChildSetType } from "../../childset";
import { ParentReference, SplootNode } from "../../node";
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from "../../node_category_registry";
import { SuggestedNode } from "../../suggested_node";
import { LayoutComponent, LayoutComponentType, NodeLayout, registerType, SerializedNode, TypeRegistration } from "../../type_registry";

export const STYLE_RULE = 'STYLE_RULE';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    return [new SuggestedNode(new StyleRule(null), 'style-rule', 'style rule', true, 'Set of styling properties.')];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class StyleRule extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, STYLE_RULE);
    this.addChildSet('selector', ChildSetType.Single, NodeCategory.StyleSheetSelector);
    this.addChildSet('properties', ChildSetType.Many, NodeCategory.StyleSheetProperty);
  }

  getSelector() {
    return this.getChildSet('selector');
  }

  getProperties() {
    return this.getChildSet('properties');
  }

  generateCodeString() : string {
    return '';
  }

  static deserializer(serializedNode: SerializedNode) : StyleRule {
    let doc = new StyleRule(null);
    doc.deserializeChildSet('selector', serializedNode);
    doc.deserializeChildSet('properties', serializedNode);
    return doc;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = STYLE_RULE;
    typeRegistration.deserializer = StyleRule.deserializer;
    typeRegistration.childSets = {
      'attributes': NodeCategory.HtmlAttribute,
      'content': NodeCategory.DomNode,
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.STYLE_RULE, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'select'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'selector'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'properties'),
    ]);

    registerType(typeRegistration);
    registerNodeCateogry(STYLE_RULE, NodeCategory.StyleSheetStatement, new Generator());
  }
}