import { SuggestedNode } from "../suggested_node";
import { SplootHtmlElement } from "../types/html_element";

export enum ElementType {
    Element = 1,
    Text = 2,
    // Fragment here?
  }
  
  export class HtmlElement {
      tag: string;
      type: ElementType;
      description: string;
      allowedText: boolean;
  
      constructor(type: ElementType, tag: string, description: string, allowedText: boolean) {
        this.type = type;
        this.tag = tag;
        this.description = description;
        this.allowedText = allowedText;
      }
  }
  
  export class SuggestedElement {
      element: HtmlElement;
      valid: boolean;
      reason: string;
      textContent: string;
  
      constructor(element: HtmlElement, valid: boolean, reason: string, textContent: string = "") {
          this.element = element;
          this.valid = valid;
          this.reason = reason;
          this.textContent = textContent;
      }
  }
  
  export const SCRIPT_ELEMENT = new HtmlElement(ElementType.Element, "script", "Embedded script", false);
  export const TEXT_ELEMENT = new HtmlElement(ElementType.Text, "", "Text", false);
  
  export let HTML_ELEMENTS: { [key: string]: HtmlElement; }  =
  {
      'html': new HtmlElement(ElementType.Element, 'html', 'HTML Document', false),
      'body': new HtmlElement(ElementType.Element, 'body', 'Document Content', false),
      'head': new HtmlElement(ElementType.Element, 'head', 'Document Metadata', false),
      'ul': new HtmlElement(ElementType.Element, 'ul', 'Unordered List', false),
      'ol': new HtmlElement(ElementType.Element, 'ol', 'Ordered List', false),
      'pre': new HtmlElement(ElementType.Element, 'pre', 'Preformatted text', true),
      'table': new HtmlElement(ElementType.Element, 'table', 'Table', false),
      'tbody': new HtmlElement(ElementType.Element, 'tbody', 'Table body', false),
      'thead': new HtmlElement(ElementType.Element, 'thead', 'Table header', false),
      'tfoot': new HtmlElement(ElementType.Element, 'tfoot', 'Table footer', false),
      'colgroup': new HtmlElement(ElementType.Element, 'colgroup', 'Column Group', false),
      'col': new HtmlElement(ElementType.Element, 'col', 'Column', false),
      'tr': new HtmlElement(ElementType.Element, 'tr', 'Table Row', false),
      'th': new HtmlElement(ElementType.Element, 'th', 'Table Header Cell', false),
      'td': new HtmlElement(ElementType.Element, 'td', 'Table Data Cell', false),
      'p': new HtmlElement(ElementType.Element, 'p', 'Paragraph', true),
      'div': new HtmlElement(ElementType.Element, 'div', 'Division', true),
  }
  
  function createElements(tagNames: string[][], allowedText: boolean) {
      // TODO: Add description / name
      for (let i = 0; i < tagNames.length; i++) {
          if (!HTML_ELEMENTS.hasOwnProperty(tagNames[i][0])) {
              HTML_ELEMENTS[tagNames[i][0]] = (new HtmlElement(ElementType.Element, tagNames[i][0], tagNames[i][1], allowedText));
          }
      }
  }
  
  // For inside <head>
  const HTML_ELEMENTS_METADATA = [
      ['base', 'Base URL'],
      ['link', 'External resource link'],
      ['meta', 'Metadata'],
      ['style', 'CSS styles'],
      ['title', 'Page title']
  ];
  createElements(HTML_ELEMENTS_METADATA, false);
  HTML_ELEMENTS['title'] = new HtmlElement(ElementType.Element, 'title', 'Page Title', true);
  
  const HTML_ELEMENTS_CONTENT_SECTIONING = [
      ['address', 'Contact Information'],
      ['article', 'Article Content'],
      ['aside', 'Aside Content'],
      ['footer', 'Footer Content'],
      ['header', 'Header Content'],
      ['hgroup', 'Heading Group'],
      ['main', 'Main Content'],
      ['nav', 'Navigation Section'],
      ['section', 'Section'],    
      ['div', 'Division'],
  ];
  createElements(HTML_ELEMENTS_CONTENT_SECTIONING, true);
  
  const HTML_ELEMENTS_MULTIMEDIA = [
    ['area', 'Area on an Image'],
    ['audio', 'Embedded Audio'],
    ['img', 'Image'],
    ['map', 'Image Map'],
    ['track', 'Timed text track (audio/video)'],
    ['video', 'Video'],
  ];
  createElements(HTML_ELEMENTS_MULTIMEDIA, true);
  
  export const HTML_ELEMENTS_TEXT_CONTENT = [
      ['blockquote', 'Block quotation'],
      ['dd', 'Description or Definition'],
      ['dl', 'Description list'],
      ['dt', 'Description term'],
      ['figcaption', 'Caption for Figure'],
      ['figure', 'Figure'],
      ['hr', 'Horizontal Rule'],
      ['main', 'Main content'],
      ['ol', 'Ordered List'],
      ['p', 'Paragraph'],
      ['pre', 'Preformatted text'],
      ['ul', 'Unordered List'],
      ['h1', 'Heading level 1'],
      ['h2', 'Heading level 2'],
      ['h3', 'Heading level 3'],
      ['h4', 'Heading level 4'],
      ['h5', 'Heading level 5'],
      ['h6', 'Heading level 6'],
  ];
  createElements(HTML_ELEMENTS_TEXT_CONTENT, true);
  HTML_ELEMENTS['ul'] = new HtmlElement(ElementType.Element, 'ul', 'Unordered List', false);
  
  const HTML_ELEMENTS_EMBEDDED_CONTENT = [
    ['embed', 'Embedded content'],
    ['iframe', 'Inline Frame'],
    ['object', 'External Resource'],
    ['param', 'Parameters for Object'],
    ['picture', 'Picture with alternative sources'],
    ['source', 'Media Source'],
    ['canvas', 'Graphics canvas']
  ];
  createElements(HTML_ELEMENTS_EMBEDDED_CONTENT, true);
  
  export const HTML_ELEMENTS_INLINE_TEXT = [
      ['a', 'Anchor (link)'],
      ['abbr', 'Abbreviation'],
      ['b', 'Bring attention (bold)'],
      ['bdi', 'Bidirectional Isolate'],
      ['bdo', 'Bidirectional Override'],
      ['br', 'Line break'],
      ['cite', 'Citation'],
      ['code', 'Code fragment'],
      ['data', 'Machine-readble data'],
      ['dfn', 'Definition'],
      ['em', 'Emphasis'],
      ['i', 'Itallic'],
      ['kbd', 'Keyboard input'],
      ['mark', 'Marked Text'],
      ['q', 'Inline Quotation'],
      ['rb', 'Ruby Base Text'],
      ['rp', 'Ruby Fallback Parenthesis'],
      ['rt', 'Ruby Text'],
      ['rtc', 'Ruby Text Container'],
      ['ruby', 'Ruby Annotation'],
      ['s', 'Strikethrough'],
      ['samp', 'Sample'],
      ['small', 'Small Text'],
      ['span', 'Text Span'],
      ['strong', 'Strong Importance'],
      ['sub', 'Subscript'],
      ['sup', 'Superscript'],
      ['time', 'Time'],
      ['u', 'Underline'],
      ['var', 'Variable'],
      ['ins', 'Inserted Text'],
      ['del', 'Deleted Text'],
  ];
  createElements(HTML_ELEMENTS_INLINE_TEXT, true);
  
  const HTML_ELEMENTS_FORMS = [
    ['button', 'Clickable Button'],
    ['datalist', 'Set of options'],
    ['fieldset', 'Set of fields and labels'],
    ['form', 'Form'],
    ['input', 'Input'],
    ['label', 'Label'],
    ['legend', 'Caption for fieldset'],
    ['meter', 'Input for scalable value'],
    ['optgroup', 'Grouping of select options'],
    ['option', 'Option in select box'],
    ['output', 'Results of user action'],
    ['progress', 'Progress Bar'],
    ['select', 'Select Menu'],
    ['textarea', 'Text Editing Area'],
  ];
  createElements(HTML_ELEMENTS_FORMS, true);
  
  
  const NO_CHILDREN = [
      ['hr', 'Horizontal Rule'],
      ['br', 'Line Break'],
      ['wbr', 'Word Break Opportunity'],
      ['col', 'Table Column'],
  ]
  
  NO_CHILDREN.forEach((tag : string[]) => {
      HTML_ELEMENTS[tag[0]] = new HtmlElement(ElementType.Element, tag[0], tag[1], false);
  });
  
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
  
  export function getValidElements(element: SplootHtmlElement, parentTags: string[]) : SuggestedNode[] {
      let parentInfo = generateAncestorInfo(parentTags);
  
      let suggestedElements : SuggestedNode[] = [];
      for (let key in HTML_ELEMENTS) {
          let suggestion =getSuggestedElement(element.getTag(), parentInfo, HTML_ELEMENTS[key]);
          // TODO: Allow invalid tags once we've got the UI giving a useful warning.
          if (suggestion.valid) {
            suggestedElements.push(suggestion);
          }
      }
      return suggestedElements;
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
  
  export function getSuggestedElement(parentTag: string, ancestorInfo: SummarisedAncestorInfo, potentialChild: HtmlElement) : SuggestedNode {
      
      let valid = isTagValidWithParent(potentialChild.tag, parentTag);
      if (!valid) {
          return new SuggestedNode(new SplootHtmlElement(null, potentialChild.tag), `element ${potentialChild.tag}`, potentialChild.tag, false, `Can't use inside ${parentTag} element.`)
      }
  
      let invalidAncestor = findInvalidAncestorForTag(potentialChild.tag, ancestorInfo);
      if (invalidAncestor) {
        return new SuggestedNode(new SplootHtmlElement(null, potentialChild.tag), `element ${potentialChild.tag}`, potentialChild.tag, false, `Not allowed inside ${invalidAncestor} element.`)
      }
      
      // Assume all other elements are valid :)
      return new SuggestedNode(new SplootHtmlElement(null, potentialChild.tag), `element ${potentialChild.tag}`, potentialChild.tag, true, potentialChild.description)
  }