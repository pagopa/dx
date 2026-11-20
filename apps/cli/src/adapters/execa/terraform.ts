/**
 * Terraform process adapters for automated commands and source validation.
 */
import { $, execa, ExecaError } from "execa";

/**
 * A pre-configured instance of the `execa` library for running Terraform commands.
 *
 * This instance is customized with specific environment variables and shell settings
 * to ensure compatibility with Terraform automation workflows.
 *
 * Environment Variables:
 * - `NO_COLOR`: Disables colored output to make logs cleaner and easier to parse.
 * - `TF_IN_AUTOMATION`: Indicates that Terraform is running in an automated environment.
 * - `TF_INPUT`: Disables interactive prompts, ensuring non-interactive execution.
 *
 * Configuration:
 * - `shell: true`: Enables the use of the system shell for command execution.
 *
 * Usage:
 * @example
 * await tf$`terraform init`;
 * await tf$`terraform apply -auto-approve`;
 */
export const tf$ = $({
  environment: {
    NO_COLOR: "1",
    TF_IN_AUTOMATION: "1",
    TF_INPUT: "0",
  },
  shell: true,
});

export const validateTerraformSource = async (
  content: string,
  sourcePath: string,
): Promise<void> => {
  try {
    await execa({ input: content })("terraform", ["fmt", "-no-color", "-"]);
  } catch (cause) {
    if (!(cause instanceof ExecaError)) {
      throw cause;
    }
    throw new Error(
      `Cannot validate Terraform HCL in ${sourcePath}; no changes were written\n${cause.message}`,
      { cause },
    );
  }
};
