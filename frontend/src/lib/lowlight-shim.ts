// Slim replacement for @git-diff-view/lowlight that registers only the
// languages stash actually renders, instead of bundling all 190 highlight.js
// grammars via lowlight's `all` set.
//
// Aliased in vite.config.ts so @git-diff-view/core picks this up transparently.

import { createLowlight } from "lowlight";

import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const lowlight = createLowlight();
lowlight.register({
  bash,
  css,
  diff,
  dockerfile,
  go,
  ini,
  javascript,
  json,
  markdown,
  plaintext,
  python,
  rust,
  scss,
  sql,
  typescript,
  xml,
  yaml,
});
lowlight.registerAlias({
  typescript: ["ts", "tsx"],
  javascript: ["js", "jsx", "mjs", "cjs"],
  bash: ["sh", "shell", "zsh"],
  xml: ["html"],
  ini: ["toml"],
});

// Mirrors the AST flattener in @git-diff-view/lowlight/dist/esm/index.mjs.
// Required by the runtime: core wires this through DiffFile.initSyntax.
type Node = {
  type: string;
  value?: string;
  startIndex?: number;
  endIndex?: number;
  lineNumber?: number;
  children?: Node[];
  properties?: Record<string, unknown>;
};

export const processAST = (ast: { children: Node[] }) => {
  let lineNumber = 1;
  const syntaxObj: Record<
    number,
    {
      value: string;
      lineNumber: number;
      valueLength: number;
      nodeList: { node: Node; wrapper?: Node }[];
    }
  > = {};

  const loopAST = (nodes: Node[], wrapper?: Node) => {
    nodes.forEach((node) => {
      if (node.type === "text") {
        const value = node.value ?? "";
        if (value.indexOf("\n") === -1) {
          const valueLength = value.length;
          if (!syntaxObj[lineNumber]) {
            node.startIndex = 0;
            node.endIndex = valueLength - 1;
            syntaxObj[lineNumber] = {
              value,
              lineNumber,
              valueLength,
              nodeList: [{ node, wrapper }],
            };
          } else {
            node.startIndex = syntaxObj[lineNumber].valueLength;
            node.endIndex = node.startIndex + valueLength - 1;
            syntaxObj[lineNumber].value += value;
            syntaxObj[lineNumber].valueLength += valueLength;
            syntaxObj[lineNumber].nodeList.push({ node, wrapper });
          }
          node.lineNumber = lineNumber;
          return;
        }
        const lines = value.split("\n");
        node.children = node.children || [];
        for (let i = 0; i < lines.length; i++) {
          const lineValue = i === lines.length - 1 ? lines[i] : lines[i] + "\n";
          const ln = i === 0 ? lineNumber : ++lineNumber;
          const lineValueLength = lineValue.length;
          const childNode: Node = {
            type: "text",
            value: lineValue,
            startIndex: Infinity,
            endIndex: Infinity,
            lineNumber: ln,
          };
          if (!syntaxObj[ln]) {
            childNode.startIndex = 0;
            childNode.endIndex = lineValueLength - 1;
            syntaxObj[ln] = {
              value: lineValue,
              lineNumber: ln,
              valueLength: lineValueLength,
              nodeList: [{ node: childNode, wrapper }],
            };
          } else {
            childNode.startIndex = syntaxObj[ln].valueLength;
            childNode.endIndex = childNode.startIndex + lineValueLength - 1;
            syntaxObj[ln].value += lineValue;
            syntaxObj[ln].valueLength += lineValueLength;
            syntaxObj[ln].nodeList.push({ node: childNode, wrapper });
          }
          node.children.push(childNode);
        }
        node.lineNumber = lineNumber;
        return;
      }
      if (node.children) {
        loopAST(node.children, node);
        node.lineNumber = lineNumber;
      }
    });
  };

  loopAST(ast.children);
  return { syntaxFileObject: syntaxObj, syntaxFileLineNumber: lineNumber };
};

// Type-only helper that the upstream package exports under this exact name.
// eslint-disable-next-line no-underscore-dangle
export function _getAST(): unknown {
  return {};
}

let maxLineToIgnoreSyntax = 2000;
const ignoreList: (string | RegExp)[] = [];

export const highlighter = {
  name: "lowlight",
  type: "class" as const,
  get maxLineToIgnoreSyntax() {
    return maxLineToIgnoreSyntax;
  },
  setMaxLineToIgnoreSyntax(v: number) {
    maxLineToIgnoreSyntax = v;
  },
  get ignoreSyntaxHighlightList() {
    return ignoreList;
  },
  setIgnoreSyntaxHighlightList(v: (string | RegExp)[]) {
    ignoreList.length = 0;
    ignoreList.push(...v);
  },
  getAST(raw: string, fileName?: string, lang?: string) {
    if (
      fileName &&
      ignoreList.some((p) => (p instanceof RegExp ? p.test(fileName) : fileName === p))
    ) {
      return undefined;
    }
    if (lang && lowlight.registered(lang)) {
      return lowlight.highlight(lang, raw);
    }
    // Fall back to plaintext rather than highlightAuto to avoid surprise lang
    // detection picking something we did not register.
    return lowlight.highlight("plaintext", raw);
  },
  processAST(ast: { children: Node[] }) {
    return processAST(ast);
  },
  hasRegisteredCurrentLang(lang: string) {
    return lowlight.registered(lang);
  },
  getHighlighterEngine() {
    return lowlight;
  },
};

export const versions = "0.1.3";
