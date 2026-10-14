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
import { z } from "zod/v4";

export const NX_TERRAFORM_PLUGIN_NAME = "@pagopa/nx-terraform";

/**
 * The structure the CLI relies on. The schema is loose on purpose: plugins
 * carry arbitrary options and every untouched entry must round-trip unchanged.
 */
export const nxJsonSchema = z
  .object({
    plugins: z
      .array(
        z
          .object({
            options: z
              .object({
                additionalEnvironments: z.array(z.string()).optional(),
              })
              .loose()
              .optional(),
            plugin: z.string(),
          })
          .loose(),
      )
      .optional(),
  })
  .loose();

export type NxJson = z.infer<typeof nxJsonSchema>;

const parseOptions = { allowTrailingComma: true } as const;

export type NxJsonParseResult =
  | { error: string; nxJson?: undefined }
  | { error?: undefined; nxJson: NxJson };

export const parseNxJson = (content: string): NxJsonParseResult => {
  const errors: ParseError[] = [];
  const parsed = parse(content, errors, parseOptions);

  const firstError = errors[0];
  if (firstError !== undefined) {
    return {
      error: `nx.json is not a valid JSON file (${printParseErrorCode(firstError.error)} at offset ${firstError.offset})`,
    };
  }
  if (parsed === undefined) {
    return { error: "nx.json is empty" };
  }

  const result = nxJsonSchema.safeParse(parsed);
  if (!result.success) {
    const { message, path } = result.error.issues[0];
    return {
      error: `nx.json has an unexpected shape (${[...path, message].join(": ")})`,
    };
  }

  return { nxJson: result.data };
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
