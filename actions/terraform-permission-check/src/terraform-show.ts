/** Decodes a saved Terraform plan into validated JSON without changing state. */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const showTerraformPlan = async (
  planPath: string,
  workingDirectory: string,
): Promise<unknown> => {
  try {
    const { stdout } = await execFileAsync(
      "terraform",
      ["show", "-json", planPath],
      {
        cwd: workingDirectory,
        maxBuffer: 100 * 1024 * 1024,
      },
    );
    const parsedPlan: unknown = JSON.parse(stdout);
    return parsedPlan;
  } catch (error) {
    throw new Error(`Unable to decode Terraform plan ${planPath}`, {
      cause: error,
    });
  }
};
