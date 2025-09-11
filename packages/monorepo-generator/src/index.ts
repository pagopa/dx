import type { ActionType, NodePlopAPI, PlopGeneratorConfig } from "plop";

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  getDxGitHubBootstrapLatestTag,
  getGitHubTerraformProviderLatestRelease,
} from "./actions/terraform.js";
import { defaultConfig } from "./config.js";

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
    templateFiles: path.join(templatesPath, ".github", "workflows", "*"),
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

const getActions = (templatesPath: string): ActionType[] => [
  getGitHubTerraformProviderLatestRelease(
    defaultConfig.terraform.providers.github.fallbackVersion,
  ),
  getDxGitHubBootstrapLatestTag(
    defaultConfig.terraform.dxModules.githubEnvironmentBootstrap
      .fallbackVersion,
  ),
  ...getDotFiles(templatesPath),
  ...getMonorepoFiles(templatesPath),
  ...getTerraformRepositoryFile(templatesPath),
];

const scaffoldMonorepo = (plopApi: NodePlopAPI) => {
  const entryPointDirectory = path.dirname(fileURLToPath(import.meta.url));
  // The bundled templates are in the "monorepo" subdirectory
  const templatesPath = path.join(entryPointDirectory, "monorepo");

  const prompts = getPrompts();
  const actions = getActions(templatesPath);

  plopApi.setGenerator("monorepo", {
    actions,
    description: "A scaffold for a monorepo repository",
    prompts,
  });
};

export default scaffoldMonorepo;
