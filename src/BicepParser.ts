import type { TxtNodeRange } from "@textlint/ast-node-types";
import { BicepASTNodeTypes } from "./NodeTypes";
import type { BicepDocument, BicepResource, BicepObject, BicepArray, BicepTextNode } from "./NodeTypes";

const ctxRes = "resource";
const ctxPrm = "param";
const ctxVar = "var";

const rBComment = `\\/\\*[\\s\\S]*?\\*\\/`;
const rLComment = `(?:\\/\\/[^\\n]*(?:\\n|$))`;
const rStr = `'[^']*'`;
const rBool = `true|false`;
const rInt = `\\d+`;
const rName = `[a-zA-Z_][a-zA-Z0-9_]+`;
const rSp = `(?:\\s|${rBComment})`;
const rFunc = `[a-z]+${rSp}*\\([^\\)]*\\)`;
const rProp = `${rSp}*\\.${rSp}*${rName}`;
const rField = `(?<fieldName>(?:${rStr}|[^: ]+))${rSp}*:${rSp}*(?<fieldValue>(?:${rStr}|${rBool}|${rInt}|\\{|\\[|${rFunc}(?:${rProp})*)|${rName})`;
const rParam = `param${rSp}+(?<${ctxPrm}Name>[^ ]+)${rSp}*(?<${ctxPrm}Type>[^ ]+)(?:${rSp}*=${rSp}*(?<${ctxPrm}Value>(?:${rStr}|${rBool}|${rInt}|${rFunc}(?:${rProp})*|${rName})))?`;
const rVar = `var${rSp}+(?<${ctxVar}Name>[^ ]+)(?:${rSp}*=${rSp}*(?<${ctxVar}Value>(?:${rName}|${rStr})))?`;
const rResource = `resource${rSp}+(?<${ctxRes}Id>[^ ']+)${rSp}*'(?:(?<${ctxRes}Provider>[a-z\.]+)\/)?(?<${ctxRes}Type>[a-z\/]+)(?:@(?<${ctxRes}ApiVersion>[^']+))?'(?=${rSp}*=${rSp}*\\{)`;

const createBicepReource = (id: string, value: string, text: string, range: TxtNodeRange, resourceType: string, provider?: string, apiVersion?: string): BicepResource => {
  return {
    type: BicepASTNodeTypes.BicepResource,
    id,
    resourceType,
    provider,
    apiVersion,
    raw: value,
    range,
    loc: {
      start: getLineAndColumn(text, range[0]),
      end: getLineAndColumn(text, range[1])
    },
    fields: [],
    children: []
  };
}

const createBicepObject = (value: string, text: string, range: TxtNodeRange): BicepObject => {
  return {
    type: BicepASTNodeTypes.BicepObject,
    raw: value,
    range,
    loc: {
      start: getLineAndColumn(text, range[0]),
      end: getLineAndColumn(text, range[1])
    },
    fields: []
  };
}

const createBicepArray = (value: string, text: string, range: TxtNodeRange): BicepArray => {
  return {
    type: BicepASTNodeTypes.BicepArray,
    raw: value,
    range,
    loc: {
      start: getLineAndColumn(text, range[0]),
      end: getLineAndColumn(text, range[1])
    },
    elements: []
  };
}

const createBicepTextNode = (value: string, text: string, range: TxtNodeRange): BicepTextNode => {
  const getDataType = (value: string): typeof Number | typeof String | typeof Boolean | undefined => {
    if (value.startsWith("'") && value.endsWith("'")) {
      return String;
    }
    if (value === "true" || value === "false") {
      return Boolean;
    }
    if (!isNaN(Number(value))) {
      return Number;
    }
    // return undefined;
  }
  return {
    type: BicepASTNodeTypes.BicepTextNode,
    value,
    raw: value,
    dataType: getDataType(value),
    range,
    loc: {
      start: getLineAndColumn(text, range[0]),
      end: getLineAndColumn(text, range[1])
    }
  };
}

const parseArray = (param: { text: string, position: number }): BicepArray => {
  const text = param.text;
  const rTerm = "\\]";
  const re = new RegExp(`(?<fieldValue>(?:${rStr}|${rBool}|${rInt}|\\{|\\[|${rFunc}(?:${rProp})*|${rName}))|${rTerm}`, 'i');
  let position = param.position;
  const ast = createBicepArray("", text, [position, position]);
  while (true) {
    const match = re.exec(text.substring(position));
    if (!match) {
      break;
    }
    if (match[0] === ']') {
      position += match[0].length;
      break;
    }
    if (!match.groups) {
      continue;
    }
    const groups = match.groups;
    switch (groups.fieldValue) {
      case "{":
        position += match[0].length;
        const obj = parseObject({ text, position });
        ast.elements.push(obj);
        position = obj.range[1] || position;
        break;
      case "[":
        position += match[0].length;
        const array = parseArray({ text, position });
        ast.elements.push(array);
        position = array.range[1] || position;
        break;
      default:
        const txt = createBicepTextNode(groups.fieldValue, text, [position, position + groups.fieldValue.length + 1]);
        ast.elements.push(txt);
        position += match[0].length + match.index;
        // position += text.substring(position).indexOf(groups.fieldValue) + groups.fieldValue.length;
        break;
    }
  }
  ast.range = [ast.range[0], position];
  ast.raw = text.substring(ast.range[0], ast.range[1]);
  ast.loc.end = getLineAndColumn(text, position);
  return ast;
}

const parseObject = (param: { text: string, position: number }): BicepObject => {
  const text = param.text;
  const rTerm = "\\}";
  const re = new RegExp(`(${rBComment})|(${rLComment})|(${rField})|${rTerm}`, 'i');
  let position = param.position;
  const ast = createBicepObject("", text, [position, position]);
  const matchObject = text.substring(position).match(re);
  if (!matchObject) {
    return ast;
  }
  position += matchObject.index || 0;
  while (true) {
    const match = re.exec(text.substring(position));
    if (!match) {
      break;
    }
    position += match.index;
    if (match[0] === '}') {
      position += match[0].length;
      break;
    }
    if (!match.groups) {
      continue;
    }
    const groups = match.groups;
    const fieldName = createBicepTextNode(groups.fieldName, text, [position, position + groups.fieldName.length + 1]);
    switch (groups.fieldValue) {
      case "{":
        position += match[0].length;
        const obj = parseObject({ text, position });
        ast.fields.push({ name: fieldName, value: obj });
        position = obj.range[1] || position;
        break;
      case "[":
        position += match[0].length;
        const array = parseArray({ text, position });
        ast.fields.push({ name: fieldName, value: array });
        position = array.range[1] || position;
        break;
      default:
        const posValue = text.indexOf(groups.fieldValue, position + groups.fieldName.length);
        const txt = createBicepTextNode(groups.fieldValue, text, [posValue, posValue + groups.fieldValue.length + 1]);
        ast.fields.push({ name: fieldName, value: txt });
        position += match[0].length;
        break;
    }
  }
  ast.range = [ast.range[0], position];
  ast.raw = text.substring(ast.range[0], ast.range[1]);
  ast.loc.end = getLineAndColumn(text, position);
  return ast;
}

const parseResource = (param: { text: string, position: number, parentResources?: {provider: string, resourceTypes: string, apiVersion: string} }): BicepResource | null => {
  const rTerm = "\\}";
  const re = new RegExp(`(${rBComment})|(${rLComment})|(?<ctx_${ctxRes}>${rResource})|(${rField})|${rTerm}`, 'i');
  let position = param.position;
  const text = param.text;

  const matchResource = re.exec(text.substring(position));
  if (!matchResource || !matchResource.groups) {
    return null;
  }
  const ast: BicepResource = createBicepReource(
    matchResource.groups[`${ctxRes}Id`],
    "",
    text,
    [position, position],
    param.parentResources?.resourceTypes ? `${param.parentResources?.resourceTypes}/${matchResource.groups[`${ctxRes}Type`]}` : matchResource.groups[`${ctxRes}Type`],
    param.parentResources?.provider || matchResource.groups[`${ctxRes}Provider`],
    param.parentResources?.apiVersion || matchResource.groups[`${ctxRes}ApiVersion`]
  );

  position += matchResource[0].length;
  while (true) {
    const match = re.exec(text.substring(position));
    if (!match) {
      break;
    }
    position += match.index;

    if (match[0] === '}') {
      position += match[0].length;
      break;
    }
    if (!match.groups) {
      continue;
    }
    const groups = match.groups;
    const keys = Object.keys(groups);
    const ctx = keys.find((key) => key.startsWith('ctx_') && groups[key])?.replace('ctx_', '');
    if (ctx === ctxRes) {
      const child_res = parseResource({ text, position, parentResources: {
        provider: ast.provider || "",
        resourceTypes: ast.resourceType,
        apiVersion: ast.apiVersion || ""} });
      child_res && ast.children.push(child_res);
      position = child_res?.range[1] || position;
    } else {
      const fieldName = createBicepTextNode(groups.fieldName, text, [position, position + groups.fieldName.length]);
      switch (groups.fieldValue) {
        case "{":
          position += match[0].length;
          const obj = parseObject({ text, position });
          ast.fields.push({ name: fieldName, value: obj });
          position = obj.range[1] || position;
          break;
        case "[":
          position += match[0].length;
          const array = parseArray({ text, position });
          ast.fields.push({ name: fieldName, value: array });
          position = array.range[1] || position;
          break;
        default:
          const posValue = text.indexOf(groups.fieldValue, position + groups.fieldName.length);
          const txt = createBicepTextNode(groups.fieldValue, text, [posValue, posValue + groups.fieldValue.length + 1]);
          ast.fields.push({ name: fieldName, value: txt });
          position += match[0].length;
          break;
      }
    }
  }
  ast.range = [ast.range[0], position];
  ast.raw = text.substring(ast.range[0], ast.range[1]);
  ast.loc.end = getLineAndColumn(text, position);
  return ast;
}

const getLineAndColumn = (text: string, index: number): { line: number, column: number } => {
  const lines = text.split("\n");
  let line = 0;
  let column = 0;
  while (index > lines[line].length) {
    index -= lines[line].length + 1;
    line++;
  }
  column = index;
  line++;
  return { line, column };
}

export const parse = (text: string): BicepDocument => {
  const { line, column } = getLineAndColumn(text, text.length);
  const ast: BicepDocument = {
    type: BicepASTNodeTypes.BicepDocument,
    raw: text,
    range: [0, text.length],
    loc: {
      start: { line: 1, column: 0 },
      end: { line, column }
    },
    children: []
  };

  let position = 0;

  const re = new RegExp(`(${rBComment})|(${rLComment})|(?<ctx_${ctxRes}>${rResource})|(?<ctx_${ctxPrm}>${rParam})|(?<ctx_${ctxVar}>${rVar})`, 'i');
  while (true) {
    const match = re.exec(text.substring(position));
    if (!match) {
      break;
    }
    position += match.index;
    if (!match.groups) {
      continue;
    }
    const groups = match.groups;
    const keys = Object.keys(groups);
    const ctx = keys.find((key) => key.startsWith('ctx_') && groups[key])?.replace('ctx_', '');
    if (!ctx) {
      position += match[0].length;
      continue;
    }

    if (ctx === ctxRes) {
      const res = parseResource({ text, position });
      if (res) {
        ast.children.push(res);
        position = res.range[1];
      } else {
        position += match[0].length;
      }
    } else {
      position += match[0].length;
    }
    continue;
  }
  return ast;
}