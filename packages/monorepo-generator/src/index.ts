import type { ActionType, NodePlopAPI, PlopGeneratorConfig } from "plop";

import * as fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Octokit } from "octokit";
import { z } from "zod/v4";

import {
  addPagoPaPnpmPlugin,
  configureChangesets,
  configureDevContainer,
  enablePnpm,
  installRootDependencies,
} from "./actions/pnpm.js";
import {
  addPagoPaPnpmPlugin,
  configureChangesets,
  configureDevContainer,
  enablePnpm,
  installRootDependencies,
} from "./actions/pnpm.js";
import {
  getAwsProviderLatestRelease,
  getAzureadProviderLatestRelease,
  getAzurermProviderLatestRelease,
  getDxAwsBootstrapperLatestTag,
  getDxAwsCoreValuesExporterLatestTag,
  getDxAzureBootstrapperLatestTag,
  getDxAzureCoreValuesExporterLatestTag,
  getDxGitHubBootstrapLatestTag,
  getGitHubTerraformProviderLatestRelease,
  getPagoPaDxAwsTerraformProviderLatestRelease,
  getPagoPaDxAzureTerraformProviderLatestRelease,
  getPreCommitTerraformLatestRelease,
  getTerraformLatestRelease,
  getTlsProviderLatestRelease,
} from "./actions/terraform.js";

const answersSchema = z.object({
  awsAppName: z.string().optional(),
  awsRegion: z.string().optional(),
  azureLocation: z.string().optional(),
  csp: z.enum(["aws", "azure"]),
  domain: z.string().nonempty(),
  environments: z.array(z.enum(["dev", "prod"])).nonempty(),
  instanceNumber: z.string().nonempty(),
  prefix: z.string().nonempty(),
  repoDescription: z.string().optional(),
  repoName: z.string().nonempty(),
  repoSrc: z.string().nonempty(),
});

interface ActionsDependencies {
  octokitClient: Octokit;
  plopApi: NodePlopAPI;
  templatesPath: string;
}
type CSP = z.infer<typeof answersSchema.shape.csp>;
type Environment = z.infer<typeof answersSchema.shape.environments>[number];

import { getLatestNodeVersion } from "./actions/node.js";

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
    message: "What is the AWS app name?",
    name: "awsAppName",
    validate: (input: string) =>
      input.trim().length > 0 ? true : "AWS app name cannot be empty",
    when: (answers) => answers.csp === "aws",
  },
  {
    default: "dx-d-itn-terraform-rg-01",
    message: "Azure resource group for tfstate:",
    name: "tfStateResourceGroupName",
    type: "input",
    when: (answers) => answers.csp === "azure",
  },
  {
    default: "dxditntfst01",
    message: "Azure storage account for tfstate:",
    name: "tfStateStorageAccountName",
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

const getTerraformRepositoryFiles = (templatesPath: string): ActionType[] => [
  {
    abortOnFail: true,
    base: `${templatesPath}/infra/repository`,
    destination: "{{repoSrc}}/{{repoName}}/infra/repository",
    templateFiles: path.join(templatesPath, "infra", "repository", "*.tf.hbs"),
    type: "addMany",
  },
];

const toEnvShort = (env: Environment) => {
  const envMap = new Map<Environment, string>([
    ["dev", "d"],
    ["prod", "p"],
  ]);

  return envMap.get(env);
};

const toLocationShort = (location: AzureLocation) => {
  const locationMap = new Map<AzureLocation, string>([
    ["italynorth", "itn"],
    ["northeurope", "neu"],
    ["westeurope", "weu"],
  ]);
  return locationMap.get(location);
};
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

const getTerraformEnvironmentFiles =
  (templatesPath: string) =>
  (env: Environment, csp: CSP): ActionType[] => [
    {
      abortOnFail: true,
      base: `${templatesPath}/infra/bootstrapper/${csp}`,
      data: {
        environment: env,
        envShort: toEnvShort(env),
      },
      destination: `{{repoSrc}}/{{repoName}}/infra/bootstrapper/${env}`,
      templateFiles: path.join(
        templatesPath,
        "infra",
        "bootstrapper",
        csp,
        "*.tf.hbs",
      ),
      type: "addMany",
    },
  ];

const getActions =
  ({ octokitClient, plopApi, templatesPath }: ActionsDependencies) =>
  (answers: Record<string, unknown> | undefined): ActionType[] => {
    const data = answersSchema.parse(answers);

    return [
      selectBackendPartial({ plopApi, templatesPath }),
      getGitHubTerraformProviderLatestRelease({ octokitClient }),
      getAwsProviderLatestRelease({ octokitClient }),
      getTlsProviderLatestRelease({ octokitClient }),
      getAzurermProviderLatestRelease({ octokitClient }),
      getAzureadProviderLatestRelease({ octokitClient }),
      getDxGitHubBootstrapLatestTag({ octokitClient }),
      getDxAzureBootstrapperLatestTag({ octokitClient }),
      getTerraformLatestRelease({ octokitClient }),
      getPreCommitTerraformLatestRelease({ octokitClient }),
      getDxAwsBootstrapperLatestTag({ octokitClient }),
      getDxAwsCoreValuesExporterLatestTag({ octokitClient }),
      getDxAzureCoreValuesExporterLatestTag({ octokitClient }),
      getPagoPaDxAzureTerraformProviderLatestRelease({ octokitClient }),
      getPagoPaDxAwsTerraformProviderLatestRelease({ octokitClient }),
      getLatestNodeVersion(),
      ...getDotFiles(templatesPath),
      ...getMonorepoFiles(templatesPath),
      ...getTerraformRepositoryFiles(templatesPath),
      ...data.environments.flatMap((env) =>
        getTerraformEnvironmentFiles(templatesPath)(env, data.csp),
      ),
      enablePnpm,
      addPagoPaPnpmPlugin,
      installRootDependencies,
      configureChangesets,
      configureDevContainer,
    ];
  };

const scaffoldMonorepo = (plopApi: NodePlopAPI) => {
  const entryPointDirectory = path.dirname(fileURLToPath(import.meta.url));
  const templatesPath = path.join(entryPointDirectory, "monorepo");
  const octokitClient = new Octokit({ auth: process.env.GITHUB_TOKEN });

  plopApi.setGenerator("monorepo", {
    actions: getActions({ octokitClient, plopApi, templatesPath }),
    description: "A scaffold for a monorepo repository",
    prompts: getPrompts(),
  });
};

export default scaffoldMonorepo;
