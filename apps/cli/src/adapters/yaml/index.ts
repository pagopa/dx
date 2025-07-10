import { Result } from "neverthrow";
import yaml from "yaml";

/**
 * Parses YAML content and returns the parsed object.
 * @param content - The YAML content to parse
 * @returns Result with parsed YAML object or error
 */
export const parseYaml = Result.fromThrowable(
  (content: string) => yaml.parse(content),
  () => new Error("Failed to parse YAML"),
);
