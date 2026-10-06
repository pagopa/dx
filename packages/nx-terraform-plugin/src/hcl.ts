import { DependencyType, RawProjectGraphDependency } from "@nx/devkit";
import path from "node:path";

import { ProjectFile } from "./project-file.ts";
import { getProjectNameFromRoot } from "./project.ts";

interface HclToken {
  quoted?: boolean;
  value: string;
}

function getLocalModuleSource(
  tokens: HclToken[],
  index: number,
): string | undefined {
  if (
    tokens[index].quoted ||
    tokens[index].value !== "source" ||
    tokens[index + 1]?.quoted ||
    tokens[index + 1]?.value !== "=" ||
    !tokens[index + 2]?.quoted
  ) {
    return undefined;
  }
  const source = tokens[index + 2].value;
  return source.startsWith(".") ? source : undefined;
}

function isModuleHeader(tokens: HclToken[], index: number): boolean {
  return (
    !tokens[index].quoted &&
    tokens[index].value === "module" &&
    tokens[index + 1]?.quoted === true &&
    !tokens[index + 2]?.quoted &&
    tokens[index + 2]?.value === "{"
  );
}

function readHeredocEnd(
  fileContent: string,
  index: number,
): number | undefined {
  const header = /^<<-?[ \t]*([A-Za-z_][A-Za-z0-9_]*)[^\S\r\n]*\r?\n/.exec(
    fileContent.slice(index),
  );
  if (!header) return undefined;

  const delimiter = header[1];
  let cursor = index + header[0].length;
  while (cursor < fileContent.length) {
    const end = fileContent.indexOf("\n", cursor);
    const line = fileContent.slice(cursor, end < 0 ? undefined : end);
    cursor = end < 0 ? fileContent.length : end + 1;
    if (line.trim() === delimiter) break;
  }
  return cursor;
}

function tokenizeHcl(fileContent: string): HclToken[] {
  const tokens: HclToken[] = [];
  const lexer =
    /"(?:\\.|[^"\\])*"|#[^\r\n]*|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|\s+|[A-Za-z_][A-Za-z0-9_-]*|[{}=]|./gy;
  let match: null | RegExpExecArray;

  while ((match = lexer.exec(fileContent)) !== null) {
    const token = match[0];
    if (token.startsWith('"')) {
      tokens.push({ quoted: true, value: token.slice(1, -1) });
    } else if (token === "<" && fileContent[lexer.lastIndex] === "<") {
      const heredocEnd = readHeredocEnd(fileContent, match.index);
      if (heredocEnd !== undefined) {
        tokens.push({ quoted: true, value: "" });
        lexer.lastIndex = heredocEnd;
      }
    } else if (/^[A-Za-z_]/.test(token)) {
      tokens.push({ value: token });
    } else if ("{}=".includes(token)) {
      tokens.push({ value: token });
    }
  }

  return tokens;
}

export const getLocalModuleSourceRoots = (
  fileName: string,
  fileContent: string,
) => {
  const moduleSourceRoots = new Set<string>();
  const tokens = tokenizeHcl(fileContent);

  let depth = 0;
  let inModuleBlock = false;
  for (let i = 0; i < tokens.length; i++) {
    if (depth === 0 && isModuleHeader(tokens, i)) {
      inModuleBlock = true;
    }
    const moduleSource =
      inModuleBlock && depth === 1
        ? getLocalModuleSource(tokens, i)
        : undefined;
    if (moduleSource) {
      moduleSourceRoots.add(path.join(path.dirname(fileName), moduleSource));
    }
    if (!tokens[i].quoted && tokens[i].value === "{") {
      depth++;
    } else if (!tokens[i].quoted && tokens[i].value === "}") {
      depth--;
      if (depth === 0) inModuleBlock = false;
    }
  }

  return Array.from(moduleSourceRoots);
};

// Reads a Terraform configuration file and extracts static dependencies based on module sources.
// Relative module sources become Nx graph edges to the corresponding Terraform project name.
export function getStaticDependencies(
  file: ProjectFile,
  fileContent: string,
): RawProjectGraphDependency[] {
  return getLocalModuleSourceRoots(file.fileName, fileContent).map(
    (sourceRoot) => ({
      source: file.project,
      sourceFile: file.fileName,
      target: getProjectNameFromRoot(sourceRoot),
      // All dependencies from Terraform files are considered static
      // as they are defined in the configuration and do not change at runtime.
      type: DependencyType.static,
    }),
  );
}
