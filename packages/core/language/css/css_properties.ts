// https://github.com/microsoft/vscode-custom-data/blob/master/web-data/data/browsers.html-data.json
import * as vscodeCssData from 'vscode-web-custom-data/data/browsers.css-data.json';

interface Value {
  name: string,
  description: string,
}

interface Property {
  name: string,
  browsers: string[],
  syntax: string,
  relevance: number,
  description: string,
  restrictions: string[],
  values: Value[],
}

interface CssData {
  version: number,
  properties: Property[],
}


export function getCssProperties() : string[] {
  let cssData = vscodeCssData as CssData;
  let propertyNames = cssData.properties.map(prop => {
    return prop.name;
  });
  return propertyNames;
}