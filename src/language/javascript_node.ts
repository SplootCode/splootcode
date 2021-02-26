import * as recast from "recast";

import { ASTNode } from "ast-types";
import { SplootNode } from "./node";

export class JavaScriptSplootNode extends SplootNode {

  generateJsAst() : ASTNode {
    console.warn('Missing generateJsAst implementation for: ', this.type);
    return null;
  }

  generateCodeString() : string {
    let ast = this.generateJsAst();
    return recast.print(ast).code;
  }
}
