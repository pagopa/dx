import type { ActionType, NodePlopAPI, PlopGeneratorConfig } from "plop";

import * as fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Octokit } from "octokit";
import { z } from "zod/v4";

import { getLatestNodeVersion } from "./actions/node.js";
import {
  addPagoPaPnpmPlugin,
  configureChangesets,
  configureDevContainer,
  enablePnpm,
  installRootDependencies,
} from "./actions/pnpm.js";
import { terraformVersionActions } from "./actions/terraform.js";
import { existsUserOrOrg } from "./adapters/octokit/index.js";

const trimmedString = z.string().trim();

const answersSchema = z.object({
  awsAccountId: z
    .string()
    .regex(/^\d{12}$/, "AWS Account ID must be a 12-digit number")
    .optional(),
  awsAppName: z.string().optional(),
  awsRegion: z
    .literal(["eu-south-1", "eu-central-1", "eu-west-1", "eu-west-3"])
    .default("eu-south-1"),
  azureLocation: z
    .literal(["italynorth", "northeurope", "westeurope"])
    .default("italynorth"),
  businessUnit: trimmedString.min(1, "Business Unit must not be empty"),
  costCenter: trimmedString.min(1, "Cost Center must not be empty"),
  csp: z.literal(["aws", "azure"]).default("azure"),
  domain: trimmedString.min(1, "Domain cannot be empty"),
  envInstanceNumber: z
    .string()
    .regex(/^[1-9][0-9]?$/, "Instance number must be a number between 1 and 99")
    .transform((val) =>
      // Return zero-padded string (e.g. "01")
      val.padStart(2, "0"),
    ),
  environments: z
    .array(z.literal(["dev", "prod", "uat"]))
    .nonempty("Select at least one environment"),
  managementTeam: trimmedString.min(1, "Management Team must not be empty"),
  prefix: trimmedString
    .min(2, "Prefix must be at least 2 characters")
    .max(4, "Prefix must be at most 4 characters"),
  repoDescription: z.string().optional(),
  repoName: trimmedString.min(1, "Repository name cannot be empty"),
  repoOwner: trimmedString.default("pagopa"),
  repoSrc: trimmedString.min(1, "Repository source path cannot be empty"),
  tfStateResourceGroupName: z.string().default("dx-d-itn-terraform-rg-01"),
  tfStateStorageAccountName: z.string().default("dxditntfst01"),
});

interface ActionsDependencies {
  octokitClient: Octokit;
  plopApi: NodePlopAPI;
  templatesPath: string;
}
type Answers = z.infer<typeof answersSchema>;
type Environment = z.infer<typeof answersSchema.shape.environments>[number];

const validatePrompt = (schema: z.ZodSchema) => (input: unknown) => {
  const error = schema.safeParse(input).error;
  return error
    ? // Return the error message defined in the Zod schema
      z.prettifyError(error)
    : true;
};

const getPrompts = ({
  octokitClient,
}: Pick<
  ActionsDependencies,
  "octokitClient"
>): PlopGeneratorConfig["prompts"] => [
  {
    default: process.cwd(),
    message: "Where do you want to create the repository?",
    name: "repoSrc",
  },
  {
    message: "What is the repository name?",
    name: "repoName",
    validate: validatePrompt(answersSchema.shape.repoName),
  },
  {
    default: answersSchema.shape.repoOwner.def.defaultValue,
    message: "What is the GitHub repository owner? (User or Organization)",
    name: "repoOwner",
    validate: (input) => {
      const promptValidationResult = validatePrompt(
        answersSchema.shape.repoOwner,
      )(input);
      if (promptValidationResult === true) {
        // Check the provided value exists on GitHub
        const userPromise = existsUserOrOrg(octokitClient, {
          name: input,
          type: "user",
        });
        const orgPromise = existsUserOrOrg(octokitClient, {
          name: input,
          type: "org",
        });
        return (
          Promise.any([userPromise, orgPromise])
            // If any promise fulfills, the user/org exists, otherwise return the error message
            .then((result) => (result.isOk() ? true : result.error.message))
            // If all promises reject, the user/org does not exist
            .catch(
              () => `GitHub user or organization "${input}" does not exist`,
            )
        );
      }
      return promptValidationResult;
    },
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
    default: answersSchema.shape.csp.def.defaultValue,
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
    default: answersSchema.shape.azureLocation.def.defaultValue,
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
    default: answersSchema.shape.awsRegion.def.defaultValue,
    loop: false,
    message: "What is the AWS region?",
    name: "awsRegion",
    type: "list",
    when: (answers) => answers.csp === "aws",
  },
  {
    choices: ["dev", "prod", "uat"],
    message: "Which environments do you need?",
    name: "environments",
    type: "checkbox",
    validate: validatePrompt(answersSchema.shape.environments),
  },
  {
    message: "What is the project prefix?",
    name: "prefix",
    validate: validatePrompt(answersSchema.shape.prefix),
  },
  {
    message: "What is the AWS app name?",
    name: "awsAppName",
    validate: validatePrompt(answersSchema.shape.awsAppName),
    when: (answers) => answers.csp === "aws",
  },
  {
    default: answersSchema.shape.tfStateResourceGroupName.def.defaultValue,
    message: "Azure resource group for tfstate:",
    name: "tfStateResourceGroupName",
    type: "input",
    when: (answers) => answers.csp === "azure",
  },
  {
    default: answersSchema.shape.tfStateStorageAccountName.def.defaultValue,
    message: "Azure storage account for tfstate:",
    name: "tfStateStorageAccountName",
    type: "input",
    when: (answers) => answers.csp === "azure",
  },
  {
    message: "AWS Account ID:",
    name: "awsAccountId",
    type: "input",
    validate: validatePrompt(answersSchema.shape.awsAccountId),
    when: (answers) => answers.csp === "aws",
  },
  {
    message: "What is the project domain?",
    name: "domain",
    validate: validatePrompt(answersSchema.shape.domain),
  },
  {
    default: "1",
    message: "What is the instance number?",
    name: "envInstanceNumber",
    validate: validatePrompt(answersSchema.shape.envInstanceNumber),
  },
  {
    message: "What is the Cost Center for this project?",
    name: "costCenter",
    validate: validatePrompt(answersSchema.shape.costCenter),
  },
  {
    message: "What is the Management Team for this project?",
    name: "managementTeam",
    validate: validatePrompt(answersSchema.shape.managementTeam),
  },
  {
    message: "What is the Business Unit for this project?",
    name: "businessUnit",
    validate: validatePrompt(answersSchema.shape.businessUnit),
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
    ["uat", "u"],
  ]);

  return envMap.get(env);
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
  (
    env: Environment,
    { csp, envInstanceNumber }: Pick<Answers, "csp" | "envInstanceNumber">,
  ): ActionType[] => [
    {
      abortOnFail: true,
      base: `${templatesPath}/infra/bootstrapper/${csp}`,
      data: {
        environment: env,
        envShort: toEnvShort(env),
        instanceNumber: envInstanceNumber,
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
      ...terraformVersionActions({ octokitClient }),
      getLatestNodeVersion(),
      ...getDotFiles(templatesPath),
      ...getMonorepoFiles(templatesPath),
      ...getTerraformRepositoryFiles(templatesPath),
      ...data.environments.flatMap((env) =>
        getTerraformEnvironmentFiles(templatesPath)(env, data),
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
    prompts: getPrompts({ octokitClient }),
  });
};

export default scaffoldMonorepo;
