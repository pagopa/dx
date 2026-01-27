import { getLogger } from "@logtape/logtape";
import { execa } from "execa";

export async function formatTerraformCode(sourceCode: string) {
  try {
    const result = await execa({
      input: sourceCode.trim(),
    })("terraform", ["fmt", "-"]);
    return result.stdout;
  } catch {
    const logger = getLogger(["gen", "env"]);
    logger.error("Failed to format Terraform code. {sourceCode}", {
      sourceCode,
    });
    throw new Error("Failed to format Terraform code");
  }
}
