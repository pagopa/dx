/**
 * Nx parses `nx.json` with JSONC semantics (comments and trailing commas), so
 * the CLI reads and edits the file with the same parser it uses, preserving
 * comments and formatting on updates.
 *
 * Shared by the `doctor` command and the environment synchronizer.
 */
import {
  applyEdits,
  modify,
  parse,
  type ParseError,
  printParseErrorCode,
} from "jsonc-parser";

export const NX_TERRAFORM_PLUGIN_NAME = "@pagopa/nx-terraform";

export type NxJson = {
  plugins?: NxPluginEntry[];
};

type NxPluginEntry = {
  include?: string[];
  options?: { additionalEnvironments?: string[] };
  plugin: string;
};

const parseOptions = { allowTrailingComma: true } as const;

export type NxJsonParseResult =
  | { error: string; nxJson?: undefined }
  | { error?: undefined; nxJson: NxJson };

export const parseNxJson = (content: string): NxJsonParseResult => {
  const errors: ParseError[] = [];
  const nxJson = parse(content, errors, parseOptions) as NxJson | undefined;

  if (errors.length > 0) {
    const { error, offset } = errors[0] as ParseError;
    return {
      error: `nx.json is not a valid JSON file (${printParseErrorCode(error)} at offset ${offset})`,
    };
  }
  if (nxJson === undefined) {
    return { error: "nx.json is empty" };
  }

  return { nxJson };
};

/**
 * Locates the Nx Terraform plugin entry and its registered additional
 * environments. Returns `undefined` when the plugin is not configured.
 */
export const findNxTerraformPlugin = (
  nxJson: NxJson,
): undefined | { environments: string[]; index: number } => {
  const index =
    nxJson.plugins?.findIndex(
      (entry) => entry.plugin === NX_TERRAFORM_PLUGIN_NAME,
    ) ?? -1;
  if (index < 0) {
    return undefined;
  }

  return {
    environments:
      nxJson.plugins?.[index]?.options?.additionalEnvironments ?? [],
    index,
  };
};

/**
 * Adds an environment to the plugin options through a JSONC edit, so comments
 * and the existing structure of the file are preserved.
 */
export const addNxTerraformEnvironment = (
  content: string,
  pluginIndex: number,
  environments: string[],
  environmentName: string,
): string =>
  applyEdits(
    content,
    modify(
      content,
      ["plugins", pluginIndex, "options", "additionalEnvironments"],
      [...environments, environmentName],
      { formattingOptions: { insertSpaces: true, tabSize: 2 } },
    ),
  );
