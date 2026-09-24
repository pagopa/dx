/**
 * Edits the generated repository module through HCL syntax nodes while
 * preserving source text outside the environments input.
 */
import { fileURLToPath } from "node:url";
import { Language, type Node, Parser } from "web-tree-sitter";
import { z } from "zod/v4";

import {
  type Environment,
  environmentSchema,
} from "../../domain/environment.js";

const REPOSITORY_MAIN = "infra/repository/main.tf";
const KNOWN_ENVIRONMENTS = ["dev", "uat", "prod"] as const;
const environmentValueSchema = z.string().min(1);

type EnvironmentEntry = { name: string; node: Node };
type RepositoryTarget = {
  entries: EnvironmentEntry[];
  object: Node;
  tuple?: Node;
};

let languagePromise: Promise<Language> | undefined;

const createParser = async (): Promise<Parser> => {
  try {
    languagePromise ??= Parser.init().then(() =>
      Language.load(
        fileURLToPath(
          import.meta
            .resolve("@tree-sitter-grammars/tree-sitter-hcl/tree-sitter-hcl.wasm"),
        ),
      ),
    );
    const language = await languagePromise;
    const parser = new Parser();
    parser.setLanguage(language);
    return parser;
  } catch (cause) {
    throw new Error(`Cannot load the HCL parser for ${REPOSITORY_MAIN}`, {
      cause,
    });
  }
};

const inspectHcl = <T>(
  parser: Parser,
  content: string,
  inspect: (root: Node) => T,
): T => {
  const tree = parser.parse(content);
  if (!tree) {
    throw new Error(`Cannot parse HCL in ${REPOSITORY_MAIN}`);
  }

  try {
    const root = tree.rootNode;
    if (root.hasError) {
      const error = root.descendantsOfType("ERROR")[0] ?? root;
      throw new Error(
        `Invalid HCL syntax in ${REPOSITORY_MAIN} at line ${error.startPosition.row + 1}, column ${error.startPosition.column + 1}`,
      );
    }
    return inspect(root);
  } finally {
    tree.delete();
  }
};

const onlyNode = (nodes: Node[], description: string): Node => {
  const node = nodes[0];
  if (nodes.length === 0 || !node) {
    throw new Error(`Cannot find ${description} in ${REPOSITORY_MAIN}`);
  }
  if (nodes.length > 1) {
    throw new Error(`Multiple ${description} found in ${REPOSITORY_MAIN}`);
  }
  return node;
};

const nodeOfType = (node: Node, type: string): Node | undefined =>
  node.namedChildren.find((child) => child.type === type);

const repositoryKey = (element: Node): string => {
  const key = element.childForFieldName("key");
  const variable = key && nodeOfType(key, "variable_expr");
  const identifier = variable && nodeOfType(variable, "identifier");
  if (!identifier) {
    throw new Error(
      `Unsupported repository object key in ${REPOSITORY_MAIN}; expected a literal identifier`,
    );
  }
  return identifier.text;
};

const literalEnvironment = (expression: Node): string => {
  const literal = nodeOfType(expression, "literal_value");
  const string = literal && nodeOfType(literal, "string_lit");
  if (
    !string ||
    string.namedChildren.some(
      (child) =>
        child.type !== "quoted_template_start" &&
        child.type !== "template_literal" &&
        child.type !== "quoted_template_end",
    )
  ) {
    throw new Error(
      `Unsupported environments value in ${REPOSITORY_MAIN}; expected a list of literal strings`,
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(string.text);
  } catch (cause) {
    throw new Error(
      `Unsupported environments string literal in ${REPOSITORY_MAIN}`,
      { cause },
    );
  }
  const parsed = environmentValueSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid environments entry in ${REPOSITORY_MAIN}`, {
      cause: parsed.error,
    });
  }
  return parsed.data;
};

const findRepositoryTarget = (root: Node): RepositoryTarget => {
  const rootBody = nodeOfType(root, "body");
  const modules =
    rootBody?.namedChildren.filter(
      (node) =>
        node.type === "block" &&
        nodeOfType(node, "identifier")?.text === "module" &&
        nodeOfType(node, "string_lit")?.text === '"github_repository"',
    ) ?? [];
  const module = onlyNode(modules, 'module "github_repository"');
  if (
    module.namedChildren.filter((node) => node.type === "string_lit").length !==
    1
  ) {
    throw new Error(
      `Unsupported labels on module "github_repository" in ${REPOSITORY_MAIN}`,
    );
  }
  const moduleBody = nodeOfType(module, "body");
  const repository = onlyNode(
    moduleBody?.namedChildren.filter(
      (node) =>
        node.type === "attribute" &&
        nodeOfType(node, "identifier")?.text === "repository",
    ) ?? [],
    'repository attribute in module "github_repository"',
  );
  const expression = nodeOfType(repository, "expression");
  const collection = expression && nodeOfType(expression, "collection_value");
  const object = collection && nodeOfType(collection, "object");
  if (!object) {
    throw new Error(
      `Unsupported repository value in ${REPOSITORY_MAIN}; expected a literal object`,
    );
  }

  const objectElements = object.namedChildren.filter(
    (node) => node.type === "object_elem",
  );
  const keys = objectElements.map(repositoryKey);
  if (new Set(keys).size !== keys.length) {
    const duplicate = keys.find((key, index) => keys.indexOf(key) !== index);
    throw new Error(
      `Duplicate repository property "${duplicate}" in ${REPOSITORY_MAIN}`,
    );
  }
  const environmentIndex = keys.indexOf("environments");
  if (environmentIndex === -1) {
    return { entries: [], object };
  }

  const environmentElement = objectElements[environmentIndex];
  const value = environmentElement?.childForFieldName("val");
  const tuple = value && nodeOfType(value, "collection_value");
  const list = tuple && nodeOfType(tuple, "tuple");
  if (!list) {
    throw new Error(
      `Unsupported environments value in ${REPOSITORY_MAIN}; expected a list of literal strings`,
    );
  }

  const entries = list.namedChildren
    .filter((node) => node.type === "expression")
    .map((node) => ({ name: literalEnvironment(node), node }));
  if (new Set(entries.map(({ name }) => name)).size !== entries.length) {
    throw new Error(`Duplicate environments entries in ${REPOSITORY_MAIN}`);
  }
  return { entries, object, tuple: list };
};

const orderedEnvironments = (environments: Set<string>): string[] => [
  ...KNOWN_ENVIRONMENTS.filter((environment) => environments.has(environment)),
  ...Array.from(environments).filter(
    (environment) => !KNOWN_ENVIRONMENTS.some((known) => known === environment),
  ),
];

const renderEnvironmentList = (environments: Set<string>): string =>
  `[${orderedEnvironments(environments)
    .map((environment) => JSON.stringify(environment))
    .join(", ")}]`;

// String-input CST offsets refer to JavaScript string positions, including Unicode.
const insertAt = (content: string, index: number, text: string): string =>
  `${content.slice(0, index)}${text}${content.slice(index)}`;

const indentationAt = (content: string, index: number): string | undefined => {
  const lineStart = content.lastIndexOf("\n", index - 1) + 1;
  const before = content.slice(lineStart, index);
  return before.trim() === "" ? before : undefined;
};

const newlineOf = (content: string): string =>
  content.includes("\r\n") ? "\r\n" : "\n";

const insertEnvironmentsAttribute = (
  content: string,
  object: Node,
  environments: Set<string>,
): string => {
  const closing = nodeOfType(object, "object_end");
  const opening = nodeOfType(object, "object_start");
  if (!opening || !closing) {
    throw new Error(`Invalid repository object in ${REPOSITORY_MAIN}`);
  }

  const elements = object.namedChildren.filter(
    (node) => node.type === "object_elem",
  );
  const closingLineStart =
    content.lastIndexOf("\n", closing.startIndex - 1) + 1;
  const closingIndent = indentationAt(content, closing.startIndex);
  if (closingLineStart > opening.endIndex && closingIndent !== undefined) {
    const propertyIndent =
      elements
        .map((node) => indentationAt(content, node.startIndex))
        .find((indent) => indent !== undefined) ?? `${closingIndent}  `;
    const attribute = `${propertyIndent}environments           = ${renderEnvironmentList(environments)}${newlineOf(content)}`;
    return insertAt(content, closingLineStart, attribute);
  }

  const last = elements.at(-1);
  if (!last) {
    const separator =
      content.slice(opening.endIndex, closing.startIndex).length === 0
        ? " "
        : "";
    return insertAt(
      content,
      opening.endIndex,
      ` environments = ${renderEnvironmentList(environments)}${separator}`,
    );
  }
  const trailingComma = object.children.find(
    (node) =>
      node.type === "," &&
      node.startIndex >= last.endIndex &&
      node.endIndex <= closing.startIndex,
  );
  const at = trailingComma?.endIndex ?? last.endIndex;
  return insertAt(
    content,
    at,
    `${trailingComma ? " " : ", "}environments = ${renderEnvironmentList(environments)}`,
  );
};

const insertTupleEntry = (
  content: string,
  tuple: Node,
  entries: EnvironmentEntry[],
  name: string,
  desired: string[],
): string => {
  const opening = nodeOfType(tuple, "tuple_start");
  const closing = nodeOfType(tuple, "tuple_end");
  if (!opening || !closing) {
    throw new Error(`Invalid environments list in ${REPOSITORY_MAIN}`);
  }

  if (entries.length === 0) {
    const lineStart = content.lastIndexOf("\n", closing.startIndex - 1) + 1;
    const indent = indentationAt(content, closing.startIndex);
    if (lineStart > opening.endIndex && indent !== undefined) {
      return insertAt(
        content,
        lineStart,
        `${indent}  ${JSON.stringify(name)},${newlineOf(content)}`,
      );
    }
    return insertAt(content, opening.endIndex, JSON.stringify(name));
  }

  const next = entries.find(
    (entry) => desired.indexOf(entry.name) > desired.indexOf(name),
  );
  if (next) {
    const previous = entries[entries.indexOf(next) - 1];
    const comment = tuple.namedChildren.find(
      (node) =>
        node.type === "comment" &&
        node.startIndex >= (previous?.node.endIndex ?? opening.endIndex) &&
        node.endIndex < next.node.startIndex &&
        indentationAt(content, node.startIndex) !== undefined,
    );
    if (comment) {
      const commentIndent = indentationAt(content, comment.startIndex);
      if (commentIndent !== undefined) {
        const lineStart = comment.startIndex - commentIndent.length;
        if (lineStart > opening.endIndex) {
          return insertAt(
            content,
            lineStart,
            `${commentIndent}${JSON.stringify(name)},${newlineOf(content)}`,
          );
        }
      }
    }
    const indent = indentationAt(content, next.node.startIndex);
    const prefix =
      indent !== undefined && next.node.startIndex > opening.endIndex
        ? `${JSON.stringify(name)},${newlineOf(content)}${indent}`
        : `${JSON.stringify(name)}, `;
    return insertAt(content, next.node.startIndex, prefix);
  }

  const last = entries.at(-1);
  if (!last) {
    throw new Error(`Invalid environments list in ${REPOSITORY_MAIN}`);
  }
  const trailingComma = tuple.children.some(
    (node) =>
      node.type === "," &&
      node.startIndex >= last.node.endIndex &&
      node.endIndex <= closing.startIndex,
  );
  const closingLineStart =
    content.lastIndexOf("\n", closing.startIndex - 1) + 1;
  const closingIndent = indentationAt(content, closing.startIndex);
  if (closingLineStart > last.node.endIndex && closingIndent !== undefined) {
    const indent =
      indentationAt(content, last.node.startIndex) ?? `${closingIndent}  `;
    const updated = insertAt(
      content,
      closingLineStart,
      `${indent}${JSON.stringify(name)},${newlineOf(content)}`,
    );
    return trailingComma ? updated : insertAt(updated, last.node.endIndex, ",");
  }
  return trailingComma
    ? insertAt(content, closing.startIndex, ` ${JSON.stringify(name)}`)
    : insertAt(content, last.node.endIndex, `, ${JSON.stringify(name)}`);
};

export const updateRepositoryEnvironmentsHcl = async (
  content: string,
  environmentName: Environment["name"],
): Promise<string> => {
  const parsedName = environmentSchema.shape.name.safeParse(environmentName);
  if (!parsedName.success) {
    throw new Error(`Invalid environment name for ${REPOSITORY_MAIN}`, {
      cause: parsedName.error,
    });
  }

  const parser = await createParser();
  try {
    const initial = inspectHcl(parser, content, (root) => {
      const target = findRepositoryTarget(root);
      if (!target.tuple) {
        return {
          content:
            parsedName.data === "prod"
              ? content
              : insertEnvironmentsAttribute(
                  content,
                  target.object,
                  new Set([parsedName.data, "prod"]),
                ),
          entries: [] as EnvironmentEntry[],
          hasList: false,
        };
      }
      return { content, entries: target.entries, hasList: true };
    });

    let updated = initial.content;
    if (initial.hasList) {
      const existing = new Set(initial.entries.map(({ name }) => name));
      const desired = orderedEnvironments(
        new Set([...existing, parsedName.data, "prod"]),
      );
      for (const name of desired.filter((value) => !existing.has(value))) {
        updated = inspectHcl(parser, updated, (root) => {
          const target = findRepositoryTarget(root);
          if (!target.tuple) {
            throw new Error(`Cannot find environments in ${REPOSITORY_MAIN}`);
          }
          return insertTupleEntry(
            updated,
            target.tuple,
            target.entries,
            name,
            desired,
          );
        });
      }
    }
    if (updated !== content) {
      inspectHcl(parser, updated, findRepositoryTarget);
    }
    return updated;
  } finally {
    parser.delete();
  }
};
