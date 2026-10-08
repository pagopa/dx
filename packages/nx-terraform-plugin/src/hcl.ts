import { DependencyType, RawProjectGraphDependency } from "@nx/devkit";
import HCL from "@tree-sitter-grammars/tree-sitter-hcl";
import path from "node:path";
import Parser from "tree-sitter";

import { getPackageLogger } from "./logger.ts";
import { ProjectFile } from "./project-file.ts";
import { getProjectNameFromRoot } from "./project.ts";

const parser = new Parser();
parser.setLanguage(HCL);

const simpleEscapes: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  n: "\n",
  r: "\r",
  t: "\t",
};

// Decodes the escapes HCL allows in static quoted strings; templates are not evaluated.
const decodeStaticString = (raw: string): string =>
  raw.replace(
    /\\(u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|[nrt"\\])|\$\$\{|%%\{/g,
    (match, escape: string | undefined) => {
      if (match === "$${") return "${";
      if (match === "%%{") return "%{";
      if (escape === undefined) return match;
      if (escape.length > 1) {
        return String.fromCodePoint(parseInt(escape.slice(1), 16));
      }
      return simpleEscapes[escape];
    },
  );

const childOfType = (node: Parser.SyntaxNode, type: string) =>
  node.namedChildren.find((child) => child.type === type);

// Returns the decoded value of a literal string expression, or undefined for anything else.
const getLiteralString = (
  expression: Parser.SyntaxNode,
): string | undefined => {
  const literal = childOfType(expression, "literal_value");
  const stringLit = literal && childOfType(literal, "string_lit");
  const template = stringLit && childOfType(stringLit, "template_literal");
  return template && decodeStaticString(template.text);
};

const findErrorLocation = (node: Parser.SyntaxNode): Parser.Point => {
  if (node.isError || node.isMissing) return node.startPosition;
  const child = node.children.find((candidate) => candidate.hasError);
  return child ? findErrorLocation(child) : node.startPosition;
};

// Returns the raw static `source` values of top-level module blocks in a file.
const getModuleSources = (fileName: string, content: string): string[] => {
  const root = parser.parse(content).rootNode;
  if (root.hasError) {
    const location = findErrorLocation(root);
    getPackageLogger(["hcl"]).warn(
      "Skipping module sources of {fileName} at line {line}, column {column}: unsupported HCL syntax",
      {
        column: location.column + 1,
        fileName,
        line: location.row + 1,
      },
    );
    return [];
  }

  const sources: string[] = [];
  const body = childOfType(root, "body");
  for (const block of body?.namedChildren ?? []) {
    if (block.type !== "block") continue;
    const [blockType] = block.namedChildren;
    if (blockType?.type !== "identifier" || blockType.text !== "module") {
      continue;
    }
    const moduleBody = childOfType(block, "body");
    for (const attribute of moduleBody?.namedChildren ?? []) {
      if (attribute.type !== "attribute") continue;
      const name = childOfType(attribute, "identifier");
      const expression = childOfType(attribute, "expression");
      if (name?.text !== "source" || !expression) continue;
      const source = getLiteralString(expression);
      if (source?.startsWith(".")) sources.push(source);
    }
  }
  return sources;
};

// Returns workspace-relative roots of local modules referenced by a Terraform file.
// Sources resolve relative to the file's directory; references leaving the workspace are dropped.
export const getLocalModuleSourceRoots = (
  fileName: string,
  content: string,
): string[] =>
  getModuleSources(fileName, content)
    .map((source) => path.join(path.dirname(fileName), source))
    .filter((root) => root.split(path.sep)[0] !== "..");

export function getStaticDependencies(
  file: ProjectFile,
  fileContent: string,
): RawProjectGraphDependency[] {
  return getLocalModuleSourceRoots(file.fileName, fileContent).map((root) => ({
    source: file.project,
    sourceFile: file.fileName,
    target: getProjectNameFromRoot(root),
    // All dependencies from Terraform files are considered static
    // as they are defined in the configuration and do not change at runtime
    type: DependencyType.static,
  }));
}
