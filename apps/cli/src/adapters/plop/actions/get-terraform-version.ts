import { type NodePlopAPI } from "node-plop";
import fs from "node:fs/promises";
import path from "node:path";

export default function setGetTerraformVersion(plop: NodePlopAPI) {
  plop.setActionType("getTerraformVersion", async (data) => {
    const terraformVersionPath = path.join(
      process.cwd(),
      ".terraform-version",
    );
    const terraformVersion = (
      await fs.readFile(terraformVersionPath, "utf8")
    ).trim();
    if (!terraformVersion) {
      throw new Error(
        `Terraform version file "${terraformVersionPath}" is empty.`,
      );
    }

    data.terraformVersion = terraformVersion;
    return `Read Terraform version: ${terraformVersion}`;
  });
}
