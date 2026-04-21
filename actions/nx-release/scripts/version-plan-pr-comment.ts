/**
 * Pure helpers for parsing Nx version plan files and synchronizing the
 * managed pull request summary comment.
 */
import { load } from "js-yaml";
import { z } from "zod";

export const VERSION_PLAN_GUIDE_URL =
  "https://dx.pagopa.it/docs/github/pull-requests/version-plan";
export const VERSION_PLAN_SUMMARY_MARKER =
  "<!-- nx-release-version-plan-summary -->";

const ACTIVE_VERSION_PLAN_STATUSES = new Set([
  "added",
  "changed",
  "copied",
  "modified",
  "renamed",
]);
const COMMENT_PAGE_SIZE = 100;
const MANAGED_VERSION_PACKAGES_BRANCH = "nx-release/main";
const MANAGED_VERSION_PACKAGES_TITLE = "Version Packages";
const PULL_REQUEST_FILE_PAGE_SIZE = 100;
const PULL_REQUEST_FILE_PREFIX = ".nx/version-plans/";
const VERSION_PLAN_FRONTMATTER_PATTERN =
  /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

const VersionBumpSchema = z.enum([
  "major",
  "minor",
  "patch",
  "premajor",
  "preminor",
  "prepatch",
  "prerelease",
]);

export type VersionBumpType = z.infer<typeof VersionBumpSchema>;

const BUMP_PRIORITY: Record<VersionBumpType, number> = {
  major: 7,
  minor: 5,
  patch: 3,
  premajor: 6,
  preminor: 4,
  prepatch: 2,
  prerelease: 1,
};

const PullRequestCommentSchema = z.object({
  body: z.string().nullable().optional(),
  html_url: z.string(),
  id: z.number().int().positive(),
});

const PullRequestFileSchema = z.object({
  filename: z.string(),
  status: z.string(),
});

const VersionPlanFrontmatterSchema = z
  .record(z.string(), VersionBumpSchema)
  .refine(
    (frontmatter) => Object.keys(frontmatter).length > 0,
    "Version plan frontmatter must contain at least one package entry",
  );

export interface ManagedCommentResult {
  commentId: number;
  commentUrl: string;
  operation: "created" | "deleted" | "noop" | "updated";
}

export interface PullRequestComment {
  body?: null | string;
  html_url: string;
  id: number;
}

export interface PullRequestCommentOperations {
  createComment(params: {
    body: string;
    issue_number: number;
    owner: string;
    repo: string;
  }): Promise<{ data: PullRequestComment }>;
  deleteComment(params: {
    comment_id: number;
    owner: string;
    repo: string;
  }): Promise<unknown>;
  listComments(params: {
    issue_number: number;
    owner: string;
    page: number;
    per_page: number;
    repo: string;
  }): Promise<{ data: PullRequestComment[] }>;
  updateComment(params: {
    body: string;
    comment_id: number;
    owner: string;
    repo: string;
  }): Promise<{ data: PullRequestComment }>;
}

export interface PullRequestFile {
  filename: string;
  status: string;
}

export interface PullRequestFileOperations {
  listFiles(params: {
    owner: string;
    page: number;
    per_page: number;
    pull_number: number;
    repo: string;
  }): Promise<{ data: PullRequestFile[] }>;
}

export interface PullRequestIdentity {
  headRefName: string;
  title: string;
}

export interface SummaryCommentOctokit {
  rest: {
    issues: PullRequestCommentOperations;
    pulls: PullRequestFileOperations;
  };
}

export interface VersionPlanFile {
  filePath: string;
  releases: VersionPlanRelease[];
  summary: null | string;
}

export interface VersionPlanPackageSummary {
  bumpType: VersionBumpType;
  packageName: string;
  sourceFiles: string[];
}

export interface VersionPlanRelease {
  bumpType: VersionBumpType;
  packageName: string;
}

export function aggregateVersionPlanFiles(
  versionPlanFiles: VersionPlanFile[],
): VersionPlanPackageSummary[] {
  const packagesByName = new Map<string, VersionPlanPackageSummary>();

  for (const versionPlanFile of versionPlanFiles) {
    for (const release of versionPlanFile.releases) {
      const existingSummary = packagesByName.get(release.packageName);

      if (!existingSummary) {
        packagesByName.set(release.packageName, {
          bumpType: release.bumpType,
          packageName: release.packageName,
          sourceFiles: [versionPlanFile.filePath],
        });
        continue;
      }

      if (shouldReplaceBumpType(existingSummary.bumpType, release.bumpType)) {
        existingSummary.bumpType = release.bumpType;
      }

      if (!existingSummary.sourceFiles.includes(versionPlanFile.filePath)) {
        existingSummary.sourceFiles.push(versionPlanFile.filePath);
        existingSummary.sourceFiles.sort((left, right) =>
          left.localeCompare(right),
        );
      }
    }
  }

  return [...packagesByName.values()].sort((left, right) =>
    left.packageName.localeCompare(right.packageName),
  );
}

export function extractVersionPlanSummary(markdownBody: string): null | string {
  const firstMeaningfulLine = markdownBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstMeaningfulLine ? normalizeSummaryText(firstMeaningfulLine) : null;
}

export function isManagedVersionPackagesPullRequest(
  pullRequest: PullRequestIdentity,
): boolean {
  return (
    pullRequest.headRefName === MANAGED_VERSION_PACKAGES_BRANCH ||
    pullRequest.title.trim() === MANAGED_VERSION_PACKAGES_TITLE
  );
}

export async function listPullRequestFiles(
  octokit: SummaryCommentOctokit,
  owner: string,
  repo: string,
  pullRequestNumber: number,
): Promise<PullRequestFile[]> {
  const files: PullRequestFile[] = [];
  let page = 1;

  while (true) {
    const response = await octokit.rest.pulls.listFiles({
      owner,
      page,
      per_page: PULL_REQUEST_FILE_PAGE_SIZE,
      pull_number: pullRequestNumber,
      repo,
    });

    const parsedFiles = z.array(PullRequestFileSchema).safeParse(response.data);
    if (!parsedFiles.success) {
      throw new Error(
        `Failed to validate pull request files payload: ${parsedFiles.error.message}`,
      );
    }

    files.push(...parsedFiles.data);

    if (parsedFiles.data.length < PULL_REQUEST_FILE_PAGE_SIZE) {
      return files;
    }

    page += 1;
  }
}

export function parseVersionPlanFile(
  filePath: string,
  fileContent: string,
): VersionPlanFile {
  const frontmatterMatch = fileContent.match(VERSION_PLAN_FRONTMATTER_PATTERN);
  if (!frontmatterMatch) {
    throw new Error(
      `Version plan ${filePath} is missing a valid YAML frontmatter block`,
    );
  }

  const rawFrontmatter = load(frontmatterMatch[1]);
  const parsedFrontmatter =
    VersionPlanFrontmatterSchema.safeParse(rawFrontmatter);

  if (!parsedFrontmatter.success) {
    throw new Error(
      `Version plan ${filePath} has invalid frontmatter: ${parsedFrontmatter.error.message}`,
    );
  }

  const markdownBody = fileContent.slice(frontmatterMatch[0].length).trim();

  return {
    filePath,
    releases: Object.entries(parsedFrontmatter.data)
      .map(([packageName, bumpType]) => ({ bumpType, packageName }))
      .sort((left, right) => left.packageName.localeCompare(right.packageName)),
    summary: extractVersionPlanSummary(markdownBody),
  };
}

export function renderVersionPlanComment(params: {
  commitSha: string;
  owner: string;
  repo: string;
  versionPlanFiles: VersionPlanFile[];
}): string {
  const packageSummaries = aggregateVersionPlanFiles(params.versionPlanFiles);
  const versionPlanFileCount = params.versionPlanFiles.length;
  const packageCount = packageSummaries.length;
  const commitUrl = `https://github.com/${params.owner}/${params.repo}/commit/${params.commitSha}`;

  const lines = [
    VERSION_PLAN_SUMMARY_MARKER,
    "### Nx Version Plan Summary",
    "",
    `This PR currently includes ${versionPlanFileCount} version plan file${versionPlanFileCount === 1 ? "" : "s"} affecting ${packageCount} package${packageCount === 1 ? "" : "s"}.`,
    "",
    `Latest detected plan commit: [${shortCommitSha(params.commitSha)}](${commitUrl})`,
    "",
    "| Package | Bump |",
    "| --- | --- |",
    ...packageSummaries.map(
      (summary) =>
        `| ${escapeInlineMarkdown(summary.packageName)} | ${formatBumpLabel(summary.bumpType)} |`,
    ),
    "",
    "<details>",
    "<summary>Detected version plan files</summary>",
    "",
    ...params.versionPlanFiles.flatMap((versionPlanFile) => {
      const releaseList = versionPlanFile.releases
        .map(
          (release) =>
            `${release.packageName} (${formatBumpLabel(release.bumpType)})`,
        )
        .join(", ");
      const summaryText = versionPlanFile.summary ?? "No summary provided.";

      return [
        `- ${versionPlanFile.filePath}: ${releaseList}`,
        `  ${escapeInlineMarkdown(summaryText)}`,
      ];
    }),
    "",
    "</details>",
    "",
    "This comment is managed automatically by Nx Release.",
    "",
    `[Version plan guide](${VERSION_PLAN_GUIDE_URL})`,
  ];

  return lines.join("\n").trim();
}

export function selectRelevantVersionPlanFiles(
  pullRequestFiles: PullRequestFile[],
): string[] {
  return pullRequestFiles
    .filter(
      (file) =>
        file.filename.startsWith(PULL_REQUEST_FILE_PREFIX) &&
        ACTIVE_VERSION_PLAN_STATUSES.has(file.status),
    )
    .map((file) => file.filename)
    .sort((left, right) => left.localeCompare(right));
}

export async function syncVersionPlanSummaryComment(params: {
  commentBody: null | string;
  octokit: SummaryCommentOctokit;
  owner: string;
  pullRequestNumber: number;
  repo: string;
}): Promise<ManagedCommentResult | null> {
  const managedComments = await listManagedSummaryComments({
    octokit: params.octokit,
    owner: params.owner,
    pullRequestNumber: params.pullRequestNumber,
    repo: params.repo,
  });

  if (!params.commentBody) {
    return deleteManagedSummaryComments({
      comments: managedComments,
      octokit: params.octokit,
      owner: params.owner,
      repo: params.repo,
    });
  }

  const [primaryComment, ...duplicateComments] = managedComments;

  for (const duplicateComment of duplicateComments) {
    await params.octokit.rest.issues.deleteComment({
      comment_id: duplicateComment.id,
      owner: params.owner,
      repo: params.repo,
    });
  }

  if (!primaryComment) {
    const response = await params.octokit.rest.issues.createComment({
      body: params.commentBody,
      issue_number: params.pullRequestNumber,
      owner: params.owner,
      repo: params.repo,
    });

    return {
      commentId: response.data.id,
      commentUrl: response.data.html_url,
      operation: "created",
    };
  }

  if ((primaryComment.body ?? "") === params.commentBody) {
    return {
      commentId: primaryComment.id,
      commentUrl: primaryComment.html_url,
      operation: "noop",
    };
  }

  const response = await params.octokit.rest.issues.updateComment({
    body: params.commentBody,
    comment_id: primaryComment.id,
    owner: params.owner,
    repo: params.repo,
  });

  return {
    commentId: response.data.id,
    commentUrl: response.data.html_url,
    operation: "updated",
  };
}

async function deleteManagedSummaryComments(params: {
  comments: PullRequestComment[];
  octokit: SummaryCommentOctokit;
  owner: string;
  repo: string;
}): Promise<ManagedCommentResult | null> {
  if (params.comments.length === 0) {
    return null;
  }

  for (const comment of params.comments) {
    await params.octokit.rest.issues.deleteComment({
      comment_id: comment.id,
      owner: params.owner,
      repo: params.repo,
    });
  }

  return {
    commentId: params.comments[0].id,
    commentUrl: params.comments[0].html_url,
    operation: "deleted",
  };
}

function escapeInlineMarkdown(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/`/g, "\\`");
}

function formatBumpLabel(bumpType: VersionBumpType): string {
  return bumpType[0].toUpperCase() + bumpType.slice(1);
}

async function listManagedSummaryComments(params: {
  octokit: SummaryCommentOctokit;
  owner: string;
  pullRequestNumber: number;
  repo: string;
}): Promise<PullRequestComment[]> {
  const comments: PullRequestComment[] = [];
  let page = 1;

  while (true) {
    const response = await params.octokit.rest.issues.listComments({
      issue_number: params.pullRequestNumber,
      owner: params.owner,
      page,
      per_page: COMMENT_PAGE_SIZE,
      repo: params.repo,
    });

    const parsedComments = z
      .array(PullRequestCommentSchema)
      .safeParse(response.data);
    if (!parsedComments.success) {
      throw new Error(
        `Failed to validate pull request comments payload: ${parsedComments.error.message}`,
      );
    }

    comments.push(
      ...parsedComments.data.filter((comment) =>
        comment.body?.includes(VERSION_PLAN_SUMMARY_MARKER),
      ),
    );

    if (parsedComments.data.length < COMMENT_PAGE_SIZE) {
      return comments;
    }

    page += 1;
  }
}

function normalizeSummaryText(summary: string): string {
  return summary.replace(/\s+/g, " ").trim();
}

function shortCommitSha(commitSha: string): string {
  return commitSha.slice(0, 7);
}

function shouldReplaceBumpType(
  currentBumpType: VersionBumpType,
  nextBumpType: VersionBumpType,
): boolean {
  return BUMP_PRIORITY[nextBumpType] > BUMP_PRIORITY[currentBumpType];
}
