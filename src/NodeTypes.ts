import { TxtNodeRange } from "@textlint/ast-node-types";

export enum BicepASTNodeTypes {
  BicepNode = "BicepNode",
  BicepDocument = "BicepDocument",
  BicepResource = "BicepResource",
  BicepObject = "BicepObject",
  BicepArray = "BicepArray",
  BicepTextNode = "BicepTextNode",
}

type BicepNodeTypes = keyof typeof BicepASTNodeTypes;

export interface BicepNode {
  type: BicepNodeTypes;
  raw: string;
  range: TxtNodeRange;
  loc: {
    start: { line: number, column: number };
    end: { line: number, column: number };
  };
}

export interface BicepDocument extends BicepNode {
  type: BicepASTNodeTypes.BicepDocument;
  children: BicepNode[];
}

export interface BicepTextNode extends BicepNode {
  type: BicepASTNodeTypes.BicepTextNode;
  value: string;
  dataType?: typeof String | typeof Number | typeof Boolean;
}

export interface BicepResource extends BicepNode {
  type: BicepASTNodeTypes.BicepResource;
  id: string;
  apiVersion?: string;
  provider?: string;
  resourceType: string;
  fields: {
    name: BicepTextNode;
    value: BicepTextNode | BicepObject | BicepArray;
  }[];
  children: BicepResource[];
}

export type BicepArrayElement =
  | BicepTextNode
  | BicepObject
  | BicepArray;

export interface BicepArray extends BicepNode {
  type: BicepASTNodeTypes.BicepArray;
  elements: BicepArrayElement[];
}

export interface BicepObject extends BicepNode {
  type: BicepASTNodeTypes.BicepObject;
  fields: {
    name: BicepTextNode;
    value: BicepTextNode | BicepObject | BicepArray;
  }[];
}
