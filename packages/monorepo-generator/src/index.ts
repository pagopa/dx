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
      input.trim().length > 0 ? true : "Prefix cannot be empty",
  },
  {
    message: "What is the Azure location?",
    name: "azureLocation",
    validate: (input: string) =>
      input.trim().length > 0 ? true : "Azure location cannot be empty",
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
      { name: "Europe (Frankfurt)", value: "eu-central-1" },
      { name: "Europe (Ireland)", value: "eu-west-1" },
      { name: "Europe (London)", value: "eu-west-2" },
      { name: "Europe (Milan)", value: "eu-south-1" },
      { name: "Europe (Paris)", value: "eu-west-3" },
      { name: "Europe (Spain)", value: "eu-south-2" },
      { name: "Europe (Stockholm)", value: "eu-north-1" },
      { name: "Europe (Zurich)", value: "eu-central-2" },
    ],
    message: "What is the AWS region?",
    name: "awsRegion",
    type: "list",
    validate: (input: string) =>
      input.trim().length > 0 ? true : "AWS region cannot be empty",
    when: (answers) => answers.csp === "aws",
  },
  {
    message: "What is the AWS app name?",
    name: "awsAppName",
    validate: (input: string) =>
      input.trim().length > 0 ? true : "AWS app name cannot be empty",
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
