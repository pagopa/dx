/**
 * Validates Terraform environment release inputs before a workflow reaches
 * credentialed self-hosted runners.
 *
 * Workflow dispatch inputs are user-controlled, so this task resolves the
 * authoritative branch, manifest, and environment configuration through the
 * GitHub API instead of trusting those inputs or checking out their code.
 */

import path from "node:path";
import { Octokit } from "octokit";
import { z } from "zod/v4";

import type { TaskRunContext } from "../dispatcher.ts";

const nonEmptyStringSchema = z
  .string()
  .refine((value) => value.trim().length > 0, "String cannot be blank");
const commitShaSchema = z
  .string()
  .regex(/^[0-9a-f]{40}$/i, "sourceRef must be a full Git commit SHA");
const normalizedProjectRootSchema = nonEmptyStringSchema.refine(
  (projectRoot) =>
    !projectRoot.includes("\\") &&
    path.posix.normalize(projectRoot) === projectRoot &&
    projectRoot.startsWith("infra/resources/") &&
    path.posix.basename(projectRoot) !== "resources",
  "projectRoot must be a normalized Terraform environment path",
);

export const payloadSchema = z.object({
  owner: nonEmptyStringSchema,
  project: nonEmptyStringSchema,
  projectRoot: normalizedProjectRootSchema,
  repo: nonEmptyStringSchema,
  sourceRef: commitShaSchema,
});

export const resultSchema = z.object({
  applyEnvironment: nonEmptyStringSchema,
  planEnvironment: nonEmptyStringSchema,
  project: nonEmptyStringSchema,
  runnerLabel: nonEmptyStringSchema,
  sourceRef: commitShaSchema,
});

export interface GitHubDefaultBranch {
  name: string;
  protected: boolean;
}
export interface GitHubEnvironment {
  name: string;
  protectionRules: readonly string[];
}

export interface GitHubRepositoryTarget {
  owner: string;
  repo: string;
}

export interface GitHubTerraformEnvironmentReleaseClient {
  compareCommits: (
    target: GitHubRepositoryTarget,
    base: string,
    head: string,
  ) => Promise<"ahead" | "behind" | "diverged" | "identical">;
  getDefaultBranch: (
    target: GitHubRepositoryTarget,
  ) => Promise<GitHubDefaultBranch>;
  getFileContent: (
    target: GitHubRepositoryTarget,
    filePath: string,
    ref: string,
  ) => Promise<string>;
  listEnvironments: (
    target: GitHubRepositoryTarget,
  ) => Promise<readonly GitHubEnvironment[]>;
}

export type GitHubTerraformEnvironmentReleaseClientFactory = (
  token: string,
) => GitHubTerraformEnvironmentReleaseClient;

export type ValidateTerraformEnvironmentReleasePayload = z.infer<
  typeof payloadSchema
>;

export type ValidateTerraformEnvironmentReleaseResult = z.infer<
  typeof resultSchema
>;

const repositorySchema = z.object({
  default_branch: nonEmptyStringSchema,
});
const branchSchema = z.object({
  protected: z.boolean(),
});
const comparisonSchema = z.object({
  status: z.enum(["ahead", "behind", "diverged", "identical"]),
});
const fileContentSchema = z.object({
  content: nonEmptyStringSchema,
  encoding: z.literal("base64"),
  type: z.literal("file"),
});
const environmentSchema = z.object({
  name: nonEmptyStringSchema,
  protection_rules: z
    .array(
      z.object({
        type: nonEmptyStringSchema,
      }),
    )
    .optional(),
});
const environmentPageSchema = z.object({
  environments: z.array(environmentSchema),
});
const environmentManifestSchema = z.object({
  deployment: z
    .object({
      applyEnvironment: nonEmptyStringSchema,
      planEnvironment: nonEmptyStringSchema,
      runnerLabel: nonEmptyStringSchema,
    })
    .optional(),
  version: nonEmptyStringSchema,
});

class OctokitTerraformEnvironmentReleaseClient implements GitHubTerraformEnvironmentReleaseClient {
  private readonly octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async compareCommits(
    { owner, repo }: GitHubRepositoryTarget,
    base: string,
    head: string,
  ): Promise<"ahead" | "behind" | "diverged" | "identical"> {
    const { data } = await this.octokit.rest.repos.compareCommits({
      base,
      head,
      owner,
      repo,
    });
    const parseResult = comparisonSchema.safeParse(data);

    if (!parseResult.success) {
      throw new Error("GitHub returned an invalid commit comparison", {
        cause: parseResult.error,
      });
    }

    return parseResult.data.status;
  }

  async getDefaultBranch({
    owner,
    repo,
  }: GitHubRepositoryTarget): Promise<GitHubDefaultBranch> {
    const repositoryResponse = await this.octokit.rest.repos.get({
      owner,
      repo,
    });
    const repositoryResult = repositorySchema.safeParse(
      repositoryResponse.data,
    );

    if (!repositoryResult.success) {
      throw new Error("GitHub returned invalid repository metadata", {
        cause: repositoryResult.error,
      });
    }

    const branchResponse = await this.octokit.rest.repos.getBranch({
      branch: repositoryResult.data.default_branch,
      owner,
      repo,
    });
    const branchResult = branchSchema.safeParse(branchResponse.data);

    if (!branchResult.success) {
      throw new Error("GitHub returned invalid default branch metadata", {
        cause: branchResult.error,
      });
    }

    return {
      name: repositoryResult.data.default_branch,
      protected: branchResult.data.protected,
    };
  }

  async getFileContent(
    { owner, repo }: GitHubRepositoryTarget,
    filePath: string,
    ref: string,
  ): Promise<string> {
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      path: filePath,
      ref,
      repo,
    });
    const parseResult = fileContentSchema.safeParse(data);

    if (!parseResult.success) {
      throw new Error(`GitHub returned invalid content for "${filePath}"`, {
        cause: parseResult.error,
      });
    }

    return Buffer.from(parseResult.data.content, "base64").toString("utf8");
  }

  async listEnvironments({
    owner,
    repo,
  }: GitHubRepositoryTarget): Promise<readonly GitHubEnvironment[]> {
    const environments: GitHubEnvironment[] = [];
    const perPage = 100;

    // Repositories can have more than one API page of deployment environments.
    // Loading every page prevents a valid environment from being rejected only
    // because it was not included in the first response.
    for (let page = 1; ; page += 1) {
      const { data } = await this.octokit.rest.repos.getAllEnvironments({
        owner,
        page,
        per_page: perPage,
        repo,
      });
      const parseResult = environmentPageSchema.safeParse(data);

      if (!parseResult.success) {
        throw new Error("GitHub returned invalid environment metadata", {
          cause: parseResult.error,
        });
      }

      environments.push(
        ...parseResult.data.environments.map((environment) => ({
          name: environment.name,
          protectionRules:
            environment.protection_rules?.map(({ type }) => type) ?? [],
        })),
      );

      if (parseResult.data.environments.length < perPage) {
        return environments;
      }
    }
  }
}

const createOctokitTerraformEnvironmentReleaseClient: GitHubTerraformEnvironmentReleaseClientFactory =
  (token) => new OctokitTerraformEnvironmentReleaseClient(token);

/**
 * Mirrors the Terraform Nx plugin project naming convention.
 *
 * Example: `infra/resources/prod` becomes `resources-prod`.
 * Checking this relationship prevents a caller from validating one manifest
 * while later running Nx against a different project.
 */
const getExpectedProjectName = (projectRoot: string): string =>
  projectRoot
    .split("/")
    .slice(1)
    .map((part) =>
      part === "_modules" ? "modules" : part.replaceAll("_", "-"),
    )
    .join("-");

const parseManifest = (
  manifestPath: string,
  content: string,
): z.infer<typeof environmentManifestSchema> => {
  let manifest: unknown;

  try {
    manifest = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse "${manifestPath}"`, { cause: error });
  }

  const parseResult = environmentManifestSchema.safeParse(manifest);

  if (!parseResult.success) {
    throw new Error(`Manifest "${manifestPath}" is invalid`, {
      cause: parseResult.error,
    });
  }

  return parseResult.data;
};

const getDeploymentMetadata = (
  projectRoot: string,
  manifest: z.infer<typeof environmentManifestSchema>,
) =>
  // Most repositories follow the environment basename convention. Explicit
  // manifest values remain available for repositories with custom GitHub
  // environment names or runner labels.
  manifest.deployment ?? {
    applyEnvironment: `infra-${path.posix.basename(projectRoot)}-cd`,
    planEnvironment: `infra-${path.posix.basename(projectRoot)}-ci`,
    runnerLabel: path.posix.basename(projectRoot),
  };

/**
 * Resolves and validates all metadata required by the Terraform release jobs.
 *
 * The validation flow is:
 * 1. Confirm the Nx project matches the requested Terraform root.
 * 2. Require the source commit to belong to the protected default branch.
 * 3. Read `environment.json` from that exact trusted commit.
 * 4. Confirm the plan/apply GitHub environments exist and apply requires review.
 *
 * For example, this input:
 * `{ project: "resources-prod", projectRoot: "infra/resources/prod" }`
 * normally returns:
 * `{ planEnvironment: "infra-prod-ci", applyEnvironment: "infra-prod-cd",
 *    runnerLabel: "prod" }`.
 *
 * The returned object is serialized by `run-dx-task` and used as job outputs,
 * keeping the workflow itself limited to orchestration.
 */
export async function validateTerraformEnvironmentRelease(
  {
    owner,
    project,
    projectRoot,
    repo,
    sourceRef,
  }: ValidateTerraformEnvironmentReleasePayload,
  context: TaskRunContext = {},
  createClient: GitHubTerraformEnvironmentReleaseClientFactory = createOctokitTerraformEnvironmentReleaseClient,
): Promise<ValidateTerraformEnvironmentReleaseResult> {
  if (!context.githubToken) {
    throw new Error("GitHub token is required to validate a Terraform release");
  }

  const expectedProject = getExpectedProjectName(projectRoot);
  if (project !== expectedProject) {
    throw new Error(
      `Project "${project}" does not match root "${projectRoot}"`,
    );
  }

  const client = createClient(context.githubToken);
  const target = { owner, repo };
  const defaultBranch = await client.getDefaultBranch(target);

  if (!defaultBranch.protected) {
    throw new Error(`Default branch "${defaultBranch.name}" is not protected`);
  }

  // GitHub describes `head` relative to `base`. With sourceRef as the base and
  // the default branch as the head, "ahead" means the branch contains the
  // source commit; "identical" means sourceRef is the current branch tip.
  const comparisonStatus = await client.compareCommits(
    target,
    sourceRef,
    defaultBranch.name,
  );
  if (!["ahead", "identical"].includes(comparisonStatus)) {
    throw new Error(
      `Commit "${sourceRef}" is not reachable from "${defaultBranch.name}"`,
    );
  }

  // Fetching the manifest through the API avoids executing or checking out the
  // requested revision before its trust relationship has been established.
  const manifestPath = `${projectRoot}/environment.json`;
  const manifest = parseManifest(
    manifestPath,
    await client.getFileContent(target, manifestPath, sourceRef),
  );
  const deployment = getDeploymentMetadata(projectRoot, manifest);
  const environments = await client.listEnvironments(target);
  const planEnvironment = environments.find(
    ({ name }) => name === deployment.planEnvironment,
  );
  const applyEnvironment = environments.find(
    ({ name }) => name === deployment.applyEnvironment,
  );

  if (!planEnvironment) {
    throw new Error(
      `Plan environment "${deployment.planEnvironment}" does not exist`,
    );
  }
  if (!applyEnvironment) {
    throw new Error(
      `Apply environment "${deployment.applyEnvironment}" does not exist`,
    );
  }
  if (!applyEnvironment.protectionRules.includes("required_reviewers")) {
    // The plan environment is intentionally read-only. The apply environment
    // is the final safety boundary and must require an explicit human approval.
    throw new Error(
      `Apply environment "${deployment.applyEnvironment}" has no required reviewers`,
    );
  }

  return resultSchema.parse({
    ...deployment,
    project,
    sourceRef,
  });
}
