import { fileURLToPath } from "node:url";
import { Language, type Node, Parser } from "web-tree-sitter";

let languagePromise: Promise<Language> | undefined;

export const nodeOfType = (node: Node, type: string): Node | undefined =>
  node.namedChildren.find((child) => child.type === type);

export const blockLabels = (block: Node): Node[] =>
  block.namedChildren
    .filter(
      (child) => child.type === "identifier" || child.type === "string_lit",
    )
    .slice(1);

export const onlyChildOfType = (node: Node, type: string): Node | undefined => {
  const children = node.namedChildren.filter(
    (child) => child.type !== "comment",
  );
  return children.length === 1 && children[0]?.type === type
    ? children[0]
    : undefined;
};

export const stringLiteralNode = (expression: Node): Node | undefined => {
  const literal = onlyChildOfType(expression, "literal_value");
  const string = literal && onlyChildOfType(literal, "string_lit");
  return string?.namedChildren.every(
    (child) =>
      child.type === "quoted_template_start" ||
      child.type === "template_literal" ||
      child.type === "quoted_template_end",
  )
    ? string
    : undefined;
};

const createParser = async (): Promise<Parser> => {
  try {
    const language = await (languagePromise ??= Parser.init().then(() =>
      Language.load(
        fileURLToPath(
          import.meta
            .resolve("@tree-sitter-grammars/tree-sitter-hcl/tree-sitter-hcl.wasm"),
        ),
      ),
    ));
    const parser = new Parser();
    parser.setLanguage(language);
    return parser;
  } catch (cause) {
    languagePromise = undefined;
    throw new Error("Cannot load the HCL parser", { cause });
  }
};

export const inspectHcl = async <T>(
  content: string,
  filePath: string,
  inspect: (root: Node) => T,
): Promise<T> => {
  const parser = await createParser();
  const tree = parser.parse(content);
  if (!tree) {
    parser.delete();
    throw new Error(`Cannot parse HCL in ${filePath}`);
  }

  try {
    const root = tree.rootNode;
    if (root.hasError) {
      const error = root.descendantsOfType("ERROR")[0] ?? root;
      throw new Error(
        `Invalid HCL syntax in ${filePath} at line ${error.startPosition.row + 1}, column ${error.startPosition.column + 1}`,
      );
    }
    return inspect(root);
  } finally {
    tree.delete();
    parser.delete();
  }
};
