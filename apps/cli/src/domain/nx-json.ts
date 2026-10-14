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
 * A plugin entry: Nx accepts both the shorthand string form
 * (`"@pagopa/nx-docker"`) and the object form that can carry options.
 */
const nxPluginEntrySchema = z.union([
  z.string(),
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
]);

/**
 * The structure the CLI relies on. The schema is loose on purpose: plugins
 * carry arbitrary options and every untouched entry must round-trip unchanged.
 */
export const nxJsonSchema = z
  .object({
    plugins: z.array(nxPluginEntrySchema).optional(),
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
 * Position of the Nx Terraform plugin entry inside `nx.json`, with the
 * environments it registers.
 */
export type NxTerraformPluginLocation = {
  /** Registered environments; always empty for the shorthand string form. */
  environments: string[];
  index: number;
  /** True when the entry uses the shorthand string form. */
  isShorthand: boolean;
};

/**
 * Locates the Nx Terraform plugin entry and its registered additional
 * environments. Returns `undefined` when the plugin is not configured. Both
 * the object form and the shorthand string form are recognized.
 */
export const findNxTerraformPlugin = (
  nxJson: NxJson,
): NxTerraformPluginLocation | undefined => {
  const index =
    nxJson.plugins?.findIndex((entry) =>
      typeof entry === "string"
        ? entry === NX_TERRAFORM_PLUGIN_NAME
        : entry.plugin === NX_TERRAFORM_PLUGIN_NAME,
    ) ?? -1;
  if (index < 0) {
    return undefined;
  }

  const entry = nxJson.plugins?.[index];
  if (typeof entry === "string") {
    return { environments: [], index, isShorthand: true };
  }

  return {
    environments: entry?.options?.additionalEnvironments ?? [],
    index,
    isShorthand: false,
  };
};

const formattingOptions = { insertSpaces: true, tabSize: 2 } as const;

/**
 * Adds an environment to the plugin options through a JSONC edit, so comments
 * and the existing structure of the file are preserved. A shorthand string
 * entry is upgraded to the object form, the only one that can carry options.
 */
export const addNxTerraformEnvironment = (
  content: string,
  plugin: NxTerraformPluginLocation,
  environmentName: string,
): string => {
  const environments = [...plugin.environments, environmentName];

  if (plugin.isShorthand) {
    return applyEdits(
      content,
      modify(
        content,
        ["plugins", plugin.index],
        {
          options: { additionalEnvironments: environments },
          plugin: NX_TERRAFORM_PLUGIN_NAME,
        },
        { formattingOptions },
      ),
    );
  }

  return applyEdits(
    content,
    modify(
      content,
      ["plugins", plugin.index, "options", "additionalEnvironments"],
      environments,
      { formattingOptions },
    ),
  );
};
