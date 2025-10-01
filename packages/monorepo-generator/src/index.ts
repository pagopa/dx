import type { ActionType, NodePlopAPI, PlopGeneratorConfig } from "plop";

import * as fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Octokit } from "octokit";

import {
  addPagoPaPnpmPlugin,
  configureChangesets,
  configureDevContainer,
  enablePnpm,
  installRootDependencies,
} from "./actions/pnpm.js";
import {
  getDxGitHubBootstrapLatestTag,
  getGitHubTerraformProviderLatestRelease,
  getPreCommitTerraformLatestRelease,
  getTerraformLatestRelease,
} from "./actions/terraform.js";

interface ActionsDependencies {
  octokitClient: Octokit;
  plopApi: NodePlopAPI;
  templatesPath: string;
}

const getPrompts = (): PlopGeneratorConfig["prompts"] => [
  {
    default: process.cwd(),
    message: "Where do you want to create the repository?",
    name: "repoSrc",
  },
  {
    message: "What is the repository name?",
    name: "repoName",
    validate: (input: string) =>
      input.trim().length > 0 ? true : "Repository name cannot be empty",
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
  {
    message: "What is the project prefix?",
    name: "prefix",
    validate: (input: string) =>
      input.trim().length >= 2 && input.trim().length <= 4
        ? true
        : "Prefix length must be between 2 and 4 characters",
  },
  {
    choices: [
      { name: "Italy North", value: "italynorth" },
      { name: "North Europe", value: "northeurope" },
      { name: "West Europe", value: "westeurope" },
    ],
    default: "italynorth",
    loop: false,
    message: "What is the Azure location?",
    name: "azureLocation",
    type: "list",
    when: (answers) => answers.csp === "azure",
  },
  {
    message: "What is the project domain?",
    name: "domain",
    validate: (input: string) =>
      input.trim().length > 0 ? true : "Domain cannot be empty",
  },
  {
    default: "01",
    message: "What is the instance number?",
    name: "instanceNumber",
  },
  {
    choices: [
      { name: "Europe (Milan)", value: "eu-south-1" },
      { name: "Europe (Frankfurt)", value: "eu-central-1" },
      { name: "Europe (Ireland)", value: "eu-west-1" },
      { name: "Europe (Paris)", value: "eu-west-3" },
    ],
    default: "eu-south-1",
    loop: false,
    message: "What is the AWS region?",
    name: "awsRegion",
    type: "list",
    when: (answers) => answers.csp === "aws",
  },
  {
    message: "What is the AWS app name?",
    name: "awsAppName",
    validate: (input: string) =>
      input.trim().length > 0 ? true : "AWS app name cannot be empty",
    when: (answers) => answers.csp === "aws",
  },
  {
    default: "dx-d-itn-terraform-rg-01",
    message: "Azure resource group for tfstate:",
    name: "repoStateResourceGroupName",
    type: "input",
    when: (answers) => answers.csp === "azure",
  },
  {
    default: "dxditntfst01",
    message: "Azure storage account for tfstate:",
    name: "repoStateStorageAccountName",
    type: "input",
    when: (answers) => answers.csp === "azure",
  },
  {
    message: "AWS Account ID:",
    name: "awsAccountId",
    type: "input",
    validate: (input: string) =>
      /^\d{12}$/.test(input.trim())
        ? true
        : "AWS Account ID must be a 12-digit number",
    when: (answers) => answers.csp === "aws",
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

// Dynamically select the backend state partial AFTER prompts (needs answers.csp)
const selectBackendPartial =
  ({
    plopApi,
    templatesPath,
  }: Omit<ActionsDependencies, "octokitClient">): ActionType =>
  ({ csp }) => {
    const backendPath = path.join(
      templatesPath,
      "infra",
      csp,
      "partials",
      "backend-state.tf.hbs",
    );
    const content = fs.readFileSync(backendPath, "utf-8");
    plopApi.setPartial("terraformRepositoryBackendState", content);
    return `Loaded ${csp} backend state partial`;
  };

const getActions = ({
  octokitClient,
  plopApi,
  templatesPath,
}: ActionsDependencies) => [
  selectBackendPartial({ plopApi, templatesPath }),
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

  plopApi.setGenerator("monorepo", {
    actions: getActions({ octokitClient, plopApi, templatesPath }),
    description: "A scaffold for a monorepo repository",
    prompts,
  });
};

export default scaffoldMonorepo;
