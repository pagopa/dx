import path from "node:path";

const getActions = (templatesPath: string) => [
  {
    type: "getNodeVersion",
  },
  {
    repository: { name: "terraform", owner: "hashicorp" },
    resultKey: "terraformVersion",
    type: "fetchGithubRelease",
  },
  {
    repository: { name: "pre-commit-terraform", owner: "antonbabenko" },
    resultKey: "preCommitTerraformVersion",
    type: "fetchGithubRelease",
  },
  {
    abortOnFail: true,
    base: templatesPath,
    destination: "{{repoName}}",
    globOptions: { dot: true },
    templateFiles: path.join(templatesPath),
    type: "addMany",
  },
  {
    path: "{{repoName}}/.gitignore",
    transform: (content: string) =>
      content
        .trimEnd()
        .concat(
          "\n# Terraform lock files for modules\n**/modules/**/.terraform.lock.hcl\n**/_modules/**/.terraform.lock.hcl\n",
        ),
    type: "modify",
  },
  {
    type: "setupPnpm",
  },
];

export default getActions;
