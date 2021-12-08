import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, EmptySuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { HighlightColorCategory } from "../../../colors";
import { PythonExpression, PYTHON_EXPRESSION } from "./python_expression";
import { PythonFileData, StatementCapture } from "../../capture/runtime_capture";

export const PYTHON_FILE = 'PYTHON_FILE';

export class PythonFile extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_FILE);
    this.addChildSet('body', ChildSetType.Many, NodeCategory.PythonStatement);
  }

  getBody() {
    return this.getChildSet('body');
  }

  generateCodeString() : string {
    return 'print("Hello, World!")\n';
  }

  clean() {
    this.getBody().children.forEach((child: SplootNode, index: number) => {
      if (child.type === PYTHON_EXPRESSION) {
        if ((child as PythonExpression).getTokenSet().getCount() === 0) {
          this.getBody().removeChild(index);
        }
      }
    });
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture) {
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`);
    }
    console.log(capture);
    const bodyChildren = this.getBody().children;
    const data = capture.data as PythonFileData;
    console.log(`${data.body.length} should match ${bodyChildren.length}`)
    let i = 0;
    for (; i < data.body.length; i++) {
      bodyChildren[i].recursivelyApplyRuntimeCapture(data.body[i]);
    }
    if (i < bodyChildren.length) {
      for (; i < bodyChildren.length; i++) {
        bodyChildren[i].recursivelyClearRuntimeCapture();
      }
    }

    return;
  }

  static deserializer(serializedNode: SerializedNode) : PythonFile {
    let node = new PythonFile(null);
    node.deserializeChildSet('body', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = PYTHON_FILE;
    typeRegistration.deserializer = PythonFile.deserializer;
    typeRegistration.properties = [];
    typeRegistration.hasScope = true;
    typeRegistration.childSets = {'body': NodeCategory.PythonStatement};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.NONE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ]);

    registerType(typeRegistration);
    registerNodeCateogry(PYTHON_FILE, NodeCategory.PythonFile, new EmptySuggestionGenerator());
  }
}