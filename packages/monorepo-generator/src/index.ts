import type { ActionType, NodePlopAPI, PlopGeneratorConfig } from "plop";

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Octokit } from "octokit";

import {
  getDxGitHubBootstrapLatestTag,
  getGitHubTerraformProviderLatestRelease,
  getPreCommitTerraformLatestRelease,
  getTerraformLatestRelease,
} from "./actions/terraform.js";

interface ActionsDependencies {
  octokitClient: Octokit;
  templatesPath: string;
}

import {
  addPagoPaPnpmPlugin,
  configureChangesets,
  configureDevContainer,
  enablePnpm,
  installRootDependencies,
} from "./actions/pnpm.js";

const getPrompts = (): PlopGeneratorConfig["prompts"] => [
  {
    default: process.cwd(),
    message: "Where do you want to create the repository?",
    name: "repoSrc",
  },
  {
    message: "What is the repository name?",
    name: "repoName",
  },
  {
    message: "What is the repository description?",
    name: "repoDescription",
  },
  {
    choices: [
      { name: "Amazon Web Services", value: "aws" },
      { name: "Microsoft Azure", value: "azure" },
    ],
    default: "azure",
    message: "What Cloud Provider would you like to use?",
    name: "csp",
    type: "list",
  },
  {
    choices: ["dev", "prod"],
    message: "Which environments do you need?",
    name: "environments",
    type: "checkbox",
    validate: (input) =>
      input.length > 0 ? true : "Select at least one environment",
  },
];

const getDotFiles = (templatesPath: string): ActionType[] => [
  {
    abortOnFail: true,
    base: templatesPath,
    destination: "{{repoSrc}}/{{repoName}}",
    globOptions: { dot: true, onlyFiles: true },
    templateFiles: path.join(templatesPath, ".*"),
    type: "addMany",
  },
  {
    abortOnFail: true,
    base: `${templatesPath}/.github/workflows`,
    destination: "{{repoSrc}}/{{repoName}}/.github/workflows",
    globOptions: { dot: true, onlyFiles: true },
    templateFiles: path.join(templatesPath, ".github", "workflows", "*.hbs"),
    type: "addMany",
  },
  {
    path: "{{repoSrc}}/{{repoName}}/.gitignore",
    transform: (content) =>
      content
        .trimEnd()
        .concat(
          "\n# Terraform lock files for modules\n**/modules/**/.terraform.lock.hcl\n**/_modules/**/.terraform.lock.hcl\n",
        ),
    type: "modify",
  },
];

const getMonorepoFiles = (templatesPath: string): ActionType[] => [
  {
    path: "{{repoSrc}}/{{repoName}}/turbo.json",
    templateFile: path.join(templatesPath, "turbo.json"),
    type: "add",
  },
  {
    path: "{{repoSrc}}/{{repoName}}/package.json",
    templateFile: path.join(templatesPath, "package.json.hbs"),
    type: "add",
  },
  {
    path: "{{repoSrc}}/{{repoName}}/README.md",
    templateFile: path.join(templatesPath, "README.md.hbs"),
    type: "add",
  },
];

const getTerraformRepositoryFile = (templatesPath: string): ActionType[] => [
  {
    abortOnFail: true,
    base: `${templatesPath}/infra/repository`,
    destination: "{{repoSrc}}/{{repoName}}/infra/repository",
    templateFiles: path.join(templatesPath, "infra", "repository", "*.tf.hbs"),
    type: "addMany",
  },
];

const getActions = ({
  octokitClient,
  templatesPath,
}: ActionsDependencies): ActionType[] => [
  getGitHubTerraformProviderLatestRelease({ octokitClient }),
  getDxGitHubBootstrapLatestTag({ octokitClient }),
  getTerraformLatestRelease({ octokitClient }),
  getPreCommitTerraformLatestRelease({ octokitClient }),
  ...getDotFiles(templatesPath),
  ...getMonorepoFiles(templatesPath),
  ...getTerraformRepositoryFile(templatesPath),
  enablePnpm,
  addPagoPaPnpmPlugin,
  installRootDependencies,
  configureChangesets,
  configureDevContainer,
];

const scaffoldMonorepo = (plopApi: NodePlopAPI) => {
  const entryPointDirectory = path.dirname(fileURLToPath(import.meta.url));
  // The bundled templates are in the "monorepo" subdirectory
  const templatesPath = path.join(entryPointDirectory, "monorepo");
  const octokitClient = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const prompts = getPrompts();
  const actions = getActions({
    octokitClient,
    templatesPath,
  });

  plopApi.setGenerator("monorepo", {
    actions,
    description: "A scaffold for a monorepo repository",
    prompts,
  });
};

export default scaffoldMonorepo;
