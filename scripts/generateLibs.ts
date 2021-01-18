
import * as fs from "fs";
import * as ts from "typescript";

let allowedGlobals = [
  'window', 'console', 'document',
];

let manualTypeVariables = [
  'a', 'b', 'c', 'd'
];

let seenTypes = new Set();

interface FunctionTypeDefinition {
  parameters: VariableDefinition[];
  returnType: TypeExpression;
}

interface FunctionDefinition {
  name: string;
  deprecated: boolean;
  documentation?: string;
  type: FunctionTypeDefinition;
}

interface VariableDefinition {
  name: string;
  type: TypeExpression;
  deprecated: boolean;
  documentation?: string;
}

interface TypeDefinition {
  name?: string;
  documentation?: string;
  constructorParams?: VariableDefinition[];
  properties: VariableDefinition[];
  methods: FunctionDefinition[];
}

interface TypeExpression {
  type: "any" | "null" | "void" | "this" | "unknown" | "undefined" | "union" | "intersection" | "literal" | "reference" | "function" | "object" | "array";
  unionOrIntersectionList?: TypeExpression[];
  literal?: number | string | boolean;
  reference?: string;
  function?: FunctionTypeDefinition;
}

interface TypeAlias {
  name: string;
  typeExpression: TypeExpression;
}

function generateDocumentation(
  fileNames: string[],
  options: ts.CompilerOptions
): void {
  // Build a program using the set of root file names in fileNames
  let program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  let checker = program.getTypeChecker();
  let globalVariables: VariableDefinition[] = [];
  let globalFunctions: FunctionDefinition[] = [];
  let typeDefinitions: TypeDefinition[] = [];
  let typeAliases: TypeAlias[] = []

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    ts.forEachChild(sourceFile, visit);
  }

  // print out the stuff we've collected
  console.log('Writing static/generated/ts_global_variables.json');
  fs.writeFileSync("static/generated/ts_global_variables.json", JSON.stringify(globalVariables, undefined, 4));

  console.log('Writing static/generated/ts_global_functions.json');
  fs.writeFileSync("static/generated/ts_global_functions.json", JSON.stringify(globalFunctions, undefined, 4));

  console.log('Writing static/generated/ts_types.json');
  fs.writeFileSync("static/generated/ts_types.json", JSON.stringify(typeDefinitions, undefined, 4));

  console.log('Writing static/generated/ts_type_aliases.json');
  fs.writeFileSync("static/generated/ts_type_aliases.json", JSON.stringify(typeAliases, undefined, 4));
  return;

  function serializeDocumentation(documentation) : string {
    return documentation.map(documentationPart => {
      if (documentationPart.kind === 'text') {
        return documentationPart.text;
      }
      return '';
    }).join('\n');
  }

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      let varStatement = node as ts.VariableStatement;
      varStatement.declarationList.declarations.forEach(declaration => {
        let varName = (declaration.name as ts.Identifier).escapedText;
        if (allowedGlobals.includes(varName.toString())) {
          globalVariables.push(serializeVariableDeclaration(declaration));
          let varType = checker.getTypeAtLocation(declaration.name);
          serializeType(varType);
        }
        if (manualTypeVariables.includes(varName.toString())) {
          let varType = checker.getTypeAtLocation(declaration.name);
          serializeType(varType);
        }
      })
    }
    if (ts.isFunctionDeclaration(node)) {
      let funcDec = node as ts.FunctionDeclaration;
      let signature = checker.getSignatureFromDeclaration(funcDec);
      let funcDefSummary : FunctionDefinition = {
        name: funcDec.name.getText(),
        deprecated: false,
        type: {
          parameters: funcDec.parameters.map(paramDeclaration => {
            return {
              name: paramDeclaration.name.getText(),
              type: serializeTypeExpression(paramDeclaration.type),
              deprecated: false,
              documentation: '',
            }
          }),
          returnType: serializeTypeExpression(funcDec.type),
        },
        documentation: serializeDocumentation(signature.getDocumentationComment(checker)),
      };
      globalFunctions.push(funcDefSummary);
    }
  }

  function serializeFunctionTypeExpression(funcType: ts.FunctionTypeNode) : FunctionTypeDefinition {
    return {
      parameters: funcType.parameters.map(paramDeclaration => {
        return {
          name: paramDeclaration.name.getText(),
          type: serializeTypeExpression(paramDeclaration.type),
          deprecated: false,
          documentation: '',
        }
      }),
      returnType: serializeTypeExpression(funcType.type)
    };
  }

  function serializeTypeExpression(typeNode: ts.TypeNode) : TypeExpression {
    if (ts.isUnionTypeNode(typeNode)) {
      return { type: 'union', unionOrIntersectionList: typeNode.types.map(childTypeNode => {
        return serializeTypeExpression(childTypeNode);
      })}
    } else if (ts.isIntersectionTypeNode(typeNode)) {
      return { type: 'intersection', unionOrIntersectionList: typeNode.types.map(childTypeNode => {
        return serializeTypeExpression(childTypeNode);
      })}
    } else if (ts.isTypeReferenceNode(typeNode)) {
      let type = checker.getTypeFromTypeNode(typeNode);
      serializeType(type);

      // Note: I am ignoring type arguments e.g. HTMLCollectionOf<HTMLScriptElement>
      // This will come through as a plain HTMLCollectionOf.
      // TODO: Parse typeNode.typeArguments into something useful.
      return { type: 'reference', reference: typeNode.typeName.getText() };
    } else if (ts.isParenthesizedTypeNode(typeNode)) {
      let parType = typeNode as ts.ParenthesizedTypeNode;
      return serializeTypeExpression(parType.type);
    } else if (ts.isFunctionTypeNode(typeNode)) {
      let funcType = typeNode as ts.FunctionTypeNode;
      return {type: 'function', function: serializeFunctionTypeExpression(funcType)}
    } else if (ts.isTypeLiteralNode(typeNode)) {
      return {type: "literal", literal: typeNode.getText()}
    } else if (ts.isArrayTypeNode(typeNode)) {
      return { type: "array"};
    } else if (ts.isThisTypeNode(typeNode)) {
      return { type: "this"};
    } else if (typeNode.kind === ts.SyntaxKind.NumberKeyword) {
      return { type: "reference", reference: 'Number'};
    } else if (typeNode.kind === ts.SyntaxKind.StringKeyword) {
      return { type: "reference", reference: 'String'};
    } else if (typeNode.kind === ts.SyntaxKind.BooleanKeyword) {
      return { type: "reference", reference: 'Boolean'};
    } else if (typeNode.kind === ts.SyntaxKind.UnknownKeyword) {
      return { type: "unknown"};
    } else if (typeNode.kind === ts.SyntaxKind.UndefinedKeyword) {
      return { type: "undefined"};
    } else if (typeNode.kind === ts.SyntaxKind.NullKeyword) {
      return { type: "null" };
    } else if (typeNode.kind === ts.SyntaxKind.AnyKeyword) {
      return { type: "any" };
    } else if (typeNode.kind === ts.SyntaxKind.VoidKeyword) {
      return { type: "void" }
    } else {
      console.log('???', ts.SyntaxKind[typeNode.kind]);
      console.log(typeNode.getText());
    }

    return { type: "any" };
  }

  function serializeAliasType(aliasSymbol: ts.Symbol) {
    let name = aliasSymbol.getName();
    if (seenTypes.has(name)) {
      return;
    }
    seenTypes.add(name);
    aliasSymbol.declarations.forEach(dec => {
      let aliasDec = dec as ts.TypeAliasDeclaration;
      typeAliases.push({
        name: name,
        typeExpression: serializeTypeExpression(aliasDec.type),
      })
    })
  }

  function serializeType(type: ts.Type) {
    if (type.isUnionOrIntersection()) {
      type.types.forEach(subType => {
        serializeType(subType);
      })
      if (type.aliasSymbol) {
        serializeAliasType(type.aliasSymbol);
      }
      return
    }
    let typeName = '';
    if (type.getSymbol()) {
      typeName = type.getSymbol().name;
      if (type.getSymbol().name === 'globalThis') {
        // Don't load globalThis, it contains mostly duplicates of Window
        return;
      }  
    } else {
      console.log('literal:', type.isLiteral());
      return;
    }

    if (seenTypes.has(typeName)) {
      return;
    }
    seenTypes.add(typeName);

    let typeDec = {
      properties: [],
      methods: [],
    } as TypeDefinition;

    typeDec.name = typeName;
    type.getConstructSignatures().forEach(signature => {
      let params = signature.getDeclaration().parameters.map((paramDeclaration) => {
        return {
          name: paramDeclaration.name.getText(),
          type: serializeTypeExpression(paramDeclaration.type),
          deprecated: false,
          documentation: '',
        }
      })
      typeDec.constructorParams = params;
    })
    type.getProperties().forEach(propertySymbol => {
      // Documentation
      let documentation = serializeDocumentation(propertySymbol.getDocumentationComment(checker));
      // Is deprecated
      let deprecated = false;
      propertySymbol.getJsDocTags().forEach(tagInfo => {
        if (tagInfo.name === 'deprecated') {
          deprecated = true;
        }
      });
      if (!propertySymbol.valueDeclaration) {
        return;
      }
      if (ts.isPropertySignature(propertySymbol.valueDeclaration)) {
        let propSignature = propertySymbol.valueDeclaration as ts.PropertySignature;
        typeDec.properties.push({
          name: propertySymbol.escapedName.toString(),
          deprecated: deprecated,
          type: serializeTypeExpression(propSignature.type),
          documentation: documentation,
        })
      } else if (ts.isMethodSignature(propertySymbol.valueDeclaration)) {
        let methodSignature = propertySymbol.valueDeclaration as ts.MethodSignature;
        typeDec.methods.push({
          name: propertySymbol.escapedName.toString(),
          deprecated: deprecated,
          type: {
            parameters: methodSignature.parameters.map(paramDeclaration => {
              return {
                name: paramDeclaration.name.getText(),
                type: serializeTypeExpression(paramDeclaration.type),
                deprecated: false,
                documentation: '',
              }
            }),
            returnType: serializeTypeExpression(methodSignature.type)
          },
          documentation: documentation,
        })
        
        
      } else {
        console.log('Unknown value definition type: ')
        console.log(ts.SyntaxKind[propertySymbol.valueDeclaration.kind]);
        console.log(propertySymbol.valueDeclaration.getText());
      }
    })
    typeDefinitions.push(typeDec);
  }

  function serializeVariableDeclaration(declaration: ts.VariableDeclaration) : VariableDefinition {
    if (!declaration.type) {
      return
    }
    return {
      name: (declaration.name as ts.Identifier).text,
      documentation: '',
      type: serializeTypeExpression(declaration.type),
      deprecated: false,
    }
  }
}

generateDocumentation(['./scripts/dummy.ts'], {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
  types: [],
});