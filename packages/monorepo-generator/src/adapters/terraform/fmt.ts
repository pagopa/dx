import { execa } from "execa";

export async function formatTerraformCode(sourceCode: string) {
  try {
    const result = await execa({
      input: sourceCode.trim(),
    })("terraform", ["fmt", "-"]);
    return result.stdout;
  } catch {
    throw new Error("Failed to format Terraform code");
  }
}
