import { SuggestedNode } from "../suggested_node";
import { SplootHtmlElement } from "../types/html/html_element";

// https://github.com/microsoft/vscode-custom-data/blob/master/web-data/data/browsers.html-data.json
import * as vscodeHtmlData from 'vscode-web-custom-data/data/browsers.html-data.json';
import { SplootHtmlAttribute } from "../types/html/html_attribute";
import { ReactElementNode } from "../types/component/react_element";
import { ComponentProperty } from "../types/component/component_property";

interface Description {
  kind: string,
  value: string
}

interface Reference {
  name: string,
  url: string,
}

interface Tag {
  name: string,
  description: Description,
  attributes: Attribute[],
  references: Reference[],
}

interface ValueSet {
  name: string,
  values: {name: string}[],
  description: Description,
}

interface Attribute {
  name: string,
  description: Description,
  references: Reference[]
}

interface HtmlData {
  version: number,
  tags: Tag[],
  globalAttributes: Attribute[],
  valueSets: ValueSet[],
}

let htmlData = vscodeHtmlData as HtmlData;

export class SummarisedAncestorInfo {
    formTag: string;
    aTagInScope: string;
    buttonTagInScope: string;
    nobrTagInScope: string;
    pTagInButtonScope: string;
    listItemTagAutoclosing: string;
    dlItemTagAutoclosing: string;

    constructor() {
        this.formTag = null;
        this.aTagInScope = null;
        this.buttonTagInScope = null;
        this.nobrTagInScope = null;
        this.pTagInButtonScope = null;
        this.listItemTagAutoclosing = null;
        this.dlItemTagAutoclosing = null;
    }
}

// https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-scope
const inScopeTags = [
    'applet',
    'caption',
    'html',
    'table',
    'td',
    'th',
    'marquee',
    'object',
    'template',

    // https://html.spec.whatwg.org/multipage/syntax.html#html-integration-point
    // TODO: Distinguish by namespace here -- for <title>, including it here
    // errs on the side of fewer warnings
    'foreignObject',
    'desc',
    'title',
];

// https://html.spec.whatwg.org/multipage/syntax.html#special
const specialTags = [
    'address',
    'applet',
    'area',
    'article',
    'aside',
    'base',
    'basefont',
    'bgsound',
    'blockquote',
    'body',
    'br',
    'button',
    'canvas',
    'caption',
    'center',
    'col',
    'colgroup',
    'dd',
    'details',
    'dir',
    'div',
    'dl',
    'dt',
    'embed',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'frame',
    'frameset',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'head',
    'header',
    'hgroup',
    'hr',
    'html',
    'iframe',
    'img',
    'input',
    'isindex',
    'li',
    'link',
    'listing',
    'main',
    'marquee',
    'menu',
    'menuitem',
    'meta',
    'nav',
    'noembed',
    'noframes',
    'noscript',
    'object',
    'ol',
    'p',
    'param',
    'plaintext',
    'pre',
    'script',
    'section',
    'select',
    'source',
    'style',
    'summary',
    'table',
    'tbody',
    'td',
    'template',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'title',
    'tr',
    'track',
    'ul',
    'wbr',
    'xmp',
];

// https://html.spec.whatwg.org/multipage/syntax.html#has-an-element-in-button-scope
const buttonScopeTags = inScopeTags.concat(['button']);


export function generateAncestorInfo(ancestorChain: string[]) : SummarisedAncestorInfo {
    let ancestorInfo = new SummarisedAncestorInfo();

    // Must loop from root node downward
    ancestorChain.forEach((tag: string) => {
        if (inScopeTags.indexOf(tag) !== -1) {
            ancestorInfo.aTagInScope = null;
            ancestorInfo.buttonTagInScope = null;
            ancestorInfo.nobrTagInScope = null;
          }
          if (buttonScopeTags.indexOf(tag) !== -1) {
            ancestorInfo.pTagInButtonScope = null;
          }
      
          // See rules for 'li', 'dd', 'dt' start tags in
          // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
          if (
            specialTags.indexOf(tag) !== -1 &&
            tag !== 'address' &&
            tag !== 'div' &&
            tag !== 'p'
          ) {
            ancestorInfo.listItemTagAutoclosing = null;
            ancestorInfo.dlItemTagAutoclosing = null;
          }
      
          // ancestorInfo.current = tag;
      
          if (tag === 'form') {
            ancestorInfo.formTag = tag;
          }
          if (tag === 'a') {
            ancestorInfo.aTagInScope = tag;
          }
          if (tag === 'button') {
            ancestorInfo.buttonTagInScope = tag;
          }
          if (tag === 'nobr') {
            ancestorInfo.nobrTagInScope = tag;
          }
          if (tag === 'p') {
            ancestorInfo.pTagInButtonScope = tag;
          }
          if (tag === 'li') {
            ancestorInfo.listItemTagAutoclosing = tag;
          }
          if (tag === 'dd' || tag === 'dt') {
            ancestorInfo.dlItemTagAutoclosing = tag;
          }
      
          return ancestorInfo;
    });

    return ancestorInfo;
}

export function getValidElements(parentTag: string, ancestorTags: string[]) : SuggestedNode[] {
    let parentInfo = generateAncestorInfo(ancestorTags);

    let suggestedElements : SuggestedNode[] = [];
    htmlData.tags.forEach((tag: Tag) => {
      if (tag.name === 'script' || tag.name === 'style') {
        // Skip script tags, they're autocompleted separately.
        return;
      }
      let suggestion = getSuggestedElement(parentTag, parentInfo, tag);
        // TODO: Allow invalid tags once we've got the UI giving a useful warning.
        if (suggestion.valid) {
          suggestedElements.push(suggestion);
        }
    })
    return suggestedElements;
}

export function getValidReactElements(parentTag: string, ancestorTags: string[]) : SuggestedNode[] {
  let parentInfo = generateAncestorInfo(ancestorTags);

  let suggestedElements : SuggestedNode[] = [];
  htmlData.tags.forEach((tag: Tag) => {
    if (tag.name === 'script' || tag.name === 'style') {
      // Skip script tags, they're autocompleted separately.
      return;
    }
    let suggestion = getSuggestedReactElement(parentTag, parentInfo, tag);
      // TODO: Allow invalid tags once we've got the UI giving a useful warning.
      if (suggestion.valid) {
        suggestedElements.push(suggestion);
      }
  })
  return suggestedElements;
}

export function getValidAttributes(targetTag: string) : SuggestedNode[] {
  let suggestions = [];
  let seen = new Set();
  let tag = htmlData.tags.find(tag => tag.name === targetTag);
  tag.attributes.forEach(attr => {
    seen.add(attr.name);
    suggestions.push(new SuggestedNode(new SplootHtmlAttribute(null, attr.name), `attr ${attr.name}`, attr.name, true, attr.description?.value ?? `${attr.name} attribute`));
  })
  htmlData.globalAttributes.forEach(attr => {
    // There are some duplicates between tag-specific attributes and global ones.
    if (!seen.has(attr.name)) {
      suggestions.push(new SuggestedNode(new SplootHtmlAttribute(null, attr.name), `attr ${attr.name}`, attr.name, true, attr.description?.value ?? `${attr.name} attribute`));
    }
  })
  return suggestions;
}

export function getValidReactAttributes(targetTag: string) : SuggestedNode[] {
  let suggestions = [];
  let seen = new Set();
  let tag = htmlData.tags.find(tag => tag.name === targetTag);
  tag.attributes.forEach(attr => {
    seen.add(attr.name);
    suggestions.push(new SuggestedNode(new ComponentProperty(null, attr.name), `attr ${attr.name}`, attr.name, true, attr.description?.value ?? `${attr.name} attribute`));
  })
  htmlData.globalAttributes.forEach(attr => {
    // There are some duplicates between tag-specific attributes and global ones.
    if (!seen.has(attr.name)) {
      suggestions.push(new SuggestedNode(new ComponentProperty(null, attr.name), `attr ${attr.name}`, attr.name, true, attr.description?.value ?? `${attr.name} attribute`));
    }
  })
  return suggestions;
}

const impliedEndTags = [
    'dd',
    'dt',
    'li',
    'option',
    'optgroup',
    'p',
    'rp',
    'rt',
];

export const findInvalidAncestorForTag = function(tag: string, ancestorInfo: SummarisedAncestorInfo) : string {
    switch (tag) {
      case 'address':
      case 'article':
      case 'aside':
      case 'blockquote':
      case 'center':
      case 'details':
      case 'dialog':
      case 'dir':
      case 'div':
      case 'dl':
      case 'fieldset':
      case 'figcaption':
      case 'figure':
      case 'footer':
      case 'header':
      case 'hgroup':
      case 'main':
      case 'menu':
      case 'nav':
      case 'ol':
      case 'p':
      case 'section':
      case 'summary':
      case 'ul':
      case 'pre':
      case 'listing':
      case 'table':
      case 'hr':
      case 'xmp':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return ancestorInfo.pTagInButtonScope;

      case 'form':
        return ancestorInfo.formTag || ancestorInfo.pTagInButtonScope;

      case 'li':
        return ancestorInfo.listItemTagAutoclosing;

      case 'dd':
      case 'dt':
        return ancestorInfo.dlItemTagAutoclosing;

      case 'button':
        return ancestorInfo.buttonTagInScope;

      case 'a':
        // Spec says something about storing a list of markers, but it sounds
        // equivalent to this check.
        return ancestorInfo.aTagInScope;

      case 'nobr':
        return ancestorInfo.nobrTagInScope;
    }

    return null;
};

/// This is blatently copied from https://github.com/facebook/react/blob/master/packages/react-dom/src/client/validateDOMNesting.js
// This code in this file is licensed under facebook's MIT license.
/*
MIT License

Copyright (c) Facebook, Inc. and its affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export const isTagValidWithParent = function(tag, parentTag) {
    // First, let's check if we're in an unusual parsing mode...
    switch (parentTag) {
      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inselect
      case 'select':
        return tag === 'option' || tag === 'optgroup' || tag === '#text';
      case 'optgroup':
        return tag === 'option' || tag === '#text';
      // Strictly speaking, seeing an <option> doesn't mean we're in a <select>
      // but
      case 'option':
        return tag === '#text';
      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intd
      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incaption
      // No special behavior since these rules fall back to "in body" mode for
      // all except special table nodes which cause bad parsing behavior anyway.

      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intr
      case 'tr':
        return (
          tag === 'th' ||
          tag === 'td' ||
          tag === 'style' ||
          tag === 'script' ||
          tag === 'template'
        );
      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intbody
      case 'tbody':
      case 'thead':
      case 'tfoot':
        return (
          tag === 'tr' ||
          tag === 'style' ||
          tag === 'script' ||
          tag === 'template'
        );
      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-incolgroup
      case 'colgroup':
        return tag === 'col' || tag === 'template';
      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-intable
      case 'table':
        return (
          tag === 'caption' ||
          tag === 'colgroup' ||
          tag === 'tbody' ||
          tag === 'tfoot' ||
          tag === 'thead' ||
          tag === 'style' ||
          tag === 'script' ||
          tag === 'template'
        );
      // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inhead
      case 'head':
        return (
          tag === 'base' ||
          tag === 'basefont' ||
          tag === 'bgsound' ||
          tag === 'link' ||
          tag === 'meta' ||
          tag === 'title' ||
          tag === 'noscript' ||
          tag === 'noframes' ||
          tag === 'style' ||
          tag === 'script' ||
          tag === 'template'
        );
      // https://html.spec.whatwg.org/multipage/semantics.html#the-html-element
      case 'html':
        return tag === 'head' || tag === 'body' || tag === 'frameset';
      case 'frameset':
        return tag === 'frame';
      case '#document':
        return tag === 'html';
    }

    // Probably in the "in body" parsing mode, so we outlaw only tag combos
    // where the parsing rules cause implicit opens or closes to be added.
    // https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return (
          parentTag !== 'h1' &&
          parentTag !== 'h2' &&
          parentTag !== 'h3' &&
          parentTag !== 'h4' &&
          parentTag !== 'h5' &&
          parentTag !== 'h6'
        );

      case 'rp':
      case 'rt':
        return impliedEndTags.indexOf(parentTag) === -1;

      case 'body':
      case 'caption':
      case 'col':
      case 'colgroup':
      case 'frameset':
      case 'frame':
      case 'head':
      case 'html':
      case 'tbody':
      case 'td':
      case 'tfoot':
      case 'th':
      case 'thead':
      case 'tr':
        // These tags are only valid with a few parents that have special child
        // parsing rules -- if we're down here, then none of those matched and
        // so we allow it only if we don't know what the parent is, as all other
        // cases are invalid.
        return parentTag == null;
    }

    return true;
};

export function getSuggestedElement(parentTag: string, ancestorInfo: SummarisedAncestorInfo, potentialChildTag: Tag) : SuggestedNode {
    let valid = isTagValidWithParent(potentialChildTag.name, parentTag);
    if (!valid) {
        return new SuggestedNode(new SplootHtmlElement(null, potentialChildTag.name), `element ${potentialChildTag.name}`, potentialChildTag.name, false, `Can't use inside ${parentTag} element.`)
    }

    let invalidAncestor = findInvalidAncestorForTag(potentialChildTag.name, ancestorInfo);
    if (invalidAncestor) {
      return new SuggestedNode(new SplootHtmlElement(null, potentialChildTag.name), `element ${potentialChildTag.name}`, potentialChildTag.name, false, `Not allowed inside ${invalidAncestor} element.`)
    }
    
    // Assume all other elements are valid :)
    return new SuggestedNode(new SplootHtmlElement(null, potentialChildTag.name), `element ${potentialChildTag.name}`, potentialChildTag.name, true, potentialChildTag.description.value)
}


export function getSuggestedReactElement(parentTag: string, ancestorInfo: SummarisedAncestorInfo, potentialChildTag: Tag) : SuggestedNode {
  let valid = isTagValidWithParent(potentialChildTag.name, parentTag);
  if (!valid) {
      return new SuggestedNode(new ReactElementNode(null, potentialChildTag.name), `element ${potentialChildTag.name}`, potentialChildTag.name, false, `Can't use inside ${parentTag} element.`)
  }

  let invalidAncestor = findInvalidAncestorForTag(potentialChildTag.name, ancestorInfo);
  if (invalidAncestor) {
    return new SuggestedNode(new ReactElementNode(null, potentialChildTag.name), `element ${potentialChildTag.name}`, potentialChildTag.name, false, `Not allowed inside ${invalidAncestor} element.`)
  }
  
  // Assume all other elements are valid :)
  return new SuggestedNode(new ReactElementNode(null, potentialChildTag.name), `element ${potentialChildTag.name}`, potentialChildTag.name, true, potentialChildTag.description.value)
}