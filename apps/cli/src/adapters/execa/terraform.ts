import { $ } from "execa";

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
 * Use this instance to execute Terraform commands programmatically within the application.
 * Example:
 * ```typescript
 * await tf$`terraform init`;
 * await tf$`terraform apply -auto-approve`;
 * ```
 */
export const tf$ = $({
  environment: {
    NO_COLOR: "1",
    TF_IN_AUTOMATION: "1",
    TF_INPUT: "0",
  },
  shell: true,
});
