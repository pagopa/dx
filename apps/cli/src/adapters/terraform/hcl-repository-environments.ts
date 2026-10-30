/**
 * Edits the generated repository module through HCL syntax nodes while
 * preserving source text outside the environments input.
 *
 * Within module "github_repository", adding "dev":
 * Before:
 *   repository = { name = "repo" }
 * After:
 *   repository = { name = "repo", environments = ["dev", "prod"] }
 *
 * Existing literal lists are normalized only when an addition is needed.
 * Commented lists needing additions must be updated manually instead.
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

type RepositoryTarget = {
  entries: string[];
  object: Node;
  tuple?: Node;
};

let languagePromise: Promise<Language> | undefined;

const loadLanguage = async (): Promise<Language> => {
  let pendingLanguage: Promise<Language> | undefined;
  try {
    pendingLanguage = languagePromise ??= Parser.init().then(() =>
      Language.load(
        fileURLToPath(
          import.meta
            .resolve("@tree-sitter-grammars/tree-sitter-hcl/tree-sitter-hcl.wasm"),
        ),
      ),
    );
    return await pendingLanguage;
  } catch (error) {
    if (pendingLanguage !== undefined && languagePromise === pendingLanguage) {
      // Do not clear a newer retry started after this load failed.
      languagePromise = undefined;
    }
    throw error;
  }
};

const createParser = async (): Promise<Parser> => {
  try {
    const language = await loadLanguage();
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

const blockLabels = (block: Node): Node[] =>
  block.namedChildren
    .filter(
      (child) => child.type === "identifier" || child.type === "string_lit",
    )
    .slice(1);

const onlyChildOfType = (node: Node, type: string): Node | undefined => {
  const children = node.namedChildren.filter(
    (child) => child.type !== "comment",
  );
  if (children.length !== 1) {
    return undefined;
  }
  return children[0]?.type === type ? children[0] : undefined;
};

const stringLiteralNode = (expression: Node): Node | undefined => {
  const literal = onlyChildOfType(expression, "literal_value");
  const string = literal && onlyChildOfType(literal, "string_lit");
  if (
    !string ||
    string.namedChildren.some(
      (child) =>
        child.type !== "quoted_template_start" &&
        child.type !== "template_literal" &&
        child.type !== "quoted_template_end",
    )
  ) {
    return undefined;
  }
  return string;
};

const parseStringLiteral = (string: Node, description: string): string => {
  let value: unknown;
  try {
    value = JSON.parse(string.text);
  } catch (cause) {
    throw new Error(
      `Unsupported ${description} string literal in ${REPOSITORY_MAIN}`,
      { cause },
    );
  }
  const parsed = z.string().safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `Invalid ${description} string literal in ${REPOSITORY_MAIN}`,
      {
        cause: parsed.error,
      },
    );
  }
  return parsed.data;
};

const repositoryKey = (element: Node): string => {
  const key = element.childForFieldName("key");
  const variable = key && onlyChildOfType(key, "variable_expr");
  const identifier = variable && onlyChildOfType(variable, "identifier");
  if (identifier) {
    return identifier.text;
  }
  const string = key && stringLiteralNode(key);
  if (!string) {
    throw new Error(
      `Unsupported repository object key in ${REPOSITORY_MAIN}; expected a literal identifier or string`,
    );
  }
  return parseStringLiteral(string, "repository object key");
};

const literalEnvironment = (expression: Node): string => {
  const string = stringLiteralNode(expression);
  if (!string) {
    throw new Error(
      `Unsupported environments value in ${REPOSITORY_MAIN}; expected a list of literal strings`,
    );
  }

  const value = parseStringLiteral(string, "environments");
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
    rootBody?.namedChildren.filter((node) => {
      if (
        node.type !== "block" ||
        nodeOfType(node, "identifier")?.text !== "module"
      ) {
        return false;
      }
      const label = blockLabels(node)[0];
      if (!label) {
        return false;
      }
      const name =
        label.type === "identifier"
          ? label.text
          : parseStringLiteral(label, "module label");
      return name === "github_repository";
    }) ?? [];
  const module = onlyNode(modules, 'module "github_repository"');
  if (blockLabels(module).length !== 1) {
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
  const collection =
    expression && onlyChildOfType(expression, "collection_value");
  const object = collection && onlyChildOfType(collection, "object");
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
  const tuple = value && onlyChildOfType(value, "collection_value");
  const list = tuple && onlyChildOfType(tuple, "tuple");
  if (!list) {
    throw new Error(
      `Unsupported environments value in ${REPOSITORY_MAIN}; expected a list of literal strings`,
    );
  }

  const entries = list.namedChildren
    .filter((node) => node.type === "expression")
    .map(literalEnvironment);
  if (new Set(entries).size !== entries.length) {
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
    const updated = inspectHcl(parser, content, (root) => {
      const target = findRepositoryTarget(root);
      if (!target.tuple) {
        return parsedName.data === "prod"
          ? content
          : insertEnvironmentsAttribute(
              content,
              target.object,
              new Set([parsedName.data, "prod"]),
            );
      }

      const environments = new Set([
        ...target.entries,
        parsedName.data,
        "prod",
      ]);
      if (environments.size === target.entries.length) {
        return content;
      }
      if (target.tuple.descendantsOfType("comment").length > 0) {
        throw new Error(
          `Cannot update environments containing comments in ${REPOSITORY_MAIN}. Move comments outside the list or update it manually before retrying.`,
        );
      }
      return (
        content.slice(0, target.tuple.startIndex) +
        renderEnvironmentList(environments) +
        content.slice(target.tuple.endIndex)
      );
    });
    if (updated !== content) {
      inspectHcl(parser, updated, findRepositoryTarget);
    }
    return updated;
  } finally {
    parser.delete();
  }
};
