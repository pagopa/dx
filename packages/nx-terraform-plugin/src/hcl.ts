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
  const source = tokens[index + 2].value.replace(
    /\\(u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|[nrt"\\])/g,
    (escape) => {
      const character = escape.slice(1);
      if (character[0] === "u" || character[0] === "U") {
        return String.fromCodePoint(Number.parseInt(character.slice(1), 16));
      }
      switch (character) {
        case '"':
          return '"';
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        default:
          return "\\";
      }
    },
  );
  return source.startsWith(".") ? source : undefined;
}

function isModuleHeader(tokens: HclToken[], index: number): boolean {
  const label = tokens[index + 1];
  return (
    !tokens[index].quoted &&
    tokens[index].value === "module" &&
    (label?.quoted === true ||
      (!!label &&
        /^[\p{ID_Start}_][\p{ID_Continue}_-]*$/u.test(label.value))) &&
    !tokens[index + 2]?.quoted &&
    tokens[index + 2]?.value === "{"
  );
}

function readHeredocEnd(
  fileContent: string,
  index: number,
): number | undefined {
  const header =
    /^<<-?[ \t]*([\p{ID_Start}_][\p{ID_Continue}_-]*)[^\S\r\n]*\r?\n/u.exec(
      fileContent.slice(index),
    );
  if (!header) return undefined;

  const delimiter = header[1];
  let cursor = index + header[0].length;
  while (cursor < fileContent.length) {
    const end = fileContent.indexOf("\n", cursor);
    const lineStart = fileContent.lastIndexOf("\n", cursor - 1) + 1;
    const line = fileContent.slice(lineStart, end < 0 ? undefined : end);
    if (line.trim() === delimiter) {
      return end < 0 ? fileContent.length : end + 1;
    }
    const lineEnd = end < 0 ? fileContent.length : end;
    while (cursor < lineEnd) {
      if (
        fileContent.startsWith("$${", cursor) ||
        fileContent.startsWith("%%{", cursor)
      ) {
        cursor += 3;
      } else if (
        fileContent.startsWith("${", cursor) ||
        fileContent.startsWith("%{", cursor)
      ) {
        cursor = skipTemplateExpression(fileContent, cursor + 2);
      } else {
        cursor++;
      }
    }
    cursor = end < 0 ? fileContent.length : Math.max(cursor, end + 1);
  }
  return cursor;
}

function readQuotedTemplateEnd(fileContent: string, start: number): number {
  let index = start + 1;
  while (index < fileContent.length && fileContent[index] !== '"') {
    if (fileContent[index] === "\\") {
      index += 2;
    } else if (
      fileContent.startsWith("$${", index) ||
      fileContent.startsWith("%%{", index)
    ) {
      index += 3;
    } else if (
      fileContent.startsWith("${", index) ||
      fileContent.startsWith("%{", index)
    ) {
      index = skipTemplateExpression(fileContent, index + 2);
    } else {
      index++;
    }
  }
  return Math.min(index + 1, fileContent.length);
}

function skipTemplateExpression(fileContent: string, index: number): number {
  let depth = 0;
  let cursor = index;
  while (cursor < fileContent.length) {
    if (
      fileContent[cursor] === "#" ||
      fileContent.startsWith("//", cursor) ||
      fileContent.startsWith("/*", cursor)
    ) {
      const block = fileContent.startsWith("/*", cursor);
      const start = cursor + (block ? 2 : fileContent[cursor] === "#" ? 1 : 2);
      const end = fileContent.indexOf(block ? "*/" : "\n", start);
      cursor = end < 0 ? fileContent.length : end + (block ? 2 : 1);
    } else if (fileContent[cursor] === '"') {
      cursor = readQuotedTemplateEnd(fileContent, cursor);
    } else if (fileContent.startsWith("<<", cursor)) {
      cursor = readHeredocEnd(fileContent, cursor) ?? cursor + 2;
    } else if (fileContent[cursor] === "{") {
      depth++;
      cursor++;
    } else if (fileContent[cursor] === "}") {
      if (depth === 0) return cursor + 1;
      depth--;
      cursor++;
    } else {
      cursor++;
    }
  }
  return cursor;
}

function tokenizeHcl(fileContent: string): HclToken[] {
  const tokens: HclToken[] = [];
  const lexer =
    /#[^\r\n]*|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|\s+|[\p{ID_Start}_][\p{ID_Continue}_-]*|[{}=]|./guy;
  let match: null | RegExpExecArray;

  while ((match = lexer.exec(fileContent)) !== null) {
    const token = match[0];
    if (token === '"') {
      const end = readQuotedTemplateEnd(fileContent, match.index);
      tokens.push({
        quoted: true,
        value: fileContent.slice(match.index + 1, end - 1),
      });
      lexer.lastIndex = end;
    } else if (token === "<" && fileContent[lexer.lastIndex] === "<") {
      const heredocEnd = readHeredocEnd(fileContent, match.index);
      if (heredocEnd !== undefined) {
        tokens.push({ quoted: true, value: "" });
        lexer.lastIndex = heredocEnd;
      }
    } else if (/^[\p{ID_Start}_]/u.test(token)) {
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
