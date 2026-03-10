import {
  pgTable,
  text,
  integer,
  timestamp,
  bigint,
  numeric,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// --- Repositories ---
export const repositories = pgTable("repositories", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull().unique(),
  organization: text("organization").notNull(),
});

// --- Pull Requests ---
export const pullRequests = pgTable(
  "pull_requests",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    reviewDecision: text("review_decision"),
    createdAt: timestamp("created_at"),
    closedAt: timestamp("closed_at"),
    mergedAt: timestamp("merged_at"),
    mergedBy: text("merged_by"),
    additions: integer("additions"),
    totalCommentsCount: integer("total_comments_count"),
    draft: integer("draft"), // 0: false, 1: true
  },
  (t) => [
    uniqueIndex("pr_repo_number_idx").on(t.repositoryId, t.number),
    index("pr_created_at_idx").on(t.createdAt),
    index("pr_merged_at_idx").on(t.mergedAt),
  ],
);

// --- Workflows ---
export const workflows = pgTable(
  "workflows",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    name: text("name").notNull(),
    pipeline: text("pipeline"),
  },
  (t) => [index("wf_repo_idx").on(t.repositoryId)],
);

// --- Workflow Runs ---
export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    workflowId: bigint("workflow_id", { mode: "number" })
      .notNull()
      .references(() => workflows.id),
    conclusion: text("conclusion"),
    status: text("status"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("wr_repo_idx").on(t.repositoryId),
    index("wr_created_at_idx").on(t.createdAt),
    index("wr_workflow_idx").on(t.workflowId),
  ],
);

// --- IaC PR Lead Times ---
export const iacPrLeadTimes = pgTable(
  "iac_pr_lead_times",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    repositoryFullName: text("repository_full_name").notNull(),
    prNumber: integer("pr_number").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    createdAt: timestamp("created_at"),
    mergedAt: timestamp("merged_at"),
    leadTimeDays: numeric("lead_time_days"),
    targetAuthors: text("target_authors").array(),
  },
  (t) => [
    uniqueIndex("iac_pr_repo_number_idx").on(t.repositoryId, t.prNumber),
    index("iac_pr_created_at_idx").on(t.createdAt),
  ],
);

// --- Commits ---
export const commits = pgTable(
  "commits",
  {
    sha: text("sha").primaryKey(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    repositoryFullName: text("repository_full_name").notNull(),
    author: text("author"),
    committer: text("committer"),
    committerDate: timestamp("committer_date"),
    message: text("message"),
  },
  (t) => [
    index("commit_repo_idx").on(t.repositoryId),
    index("commit_date_idx").on(t.committerDate),
    index("commit_author_idx").on(t.author),
  ],
);

// --- Code Search Results ---
export const codeSearchResults = pgTable(
  "code_search_results",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    query: text("query").notNull(),
    repositoryFullName: text("repository_full_name").notNull(),
    path: text("path"),
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("code_search_query_repo_path_idx").on(
      t.query,
      t.repositoryFullName,
      t.path,
    ),
  ],
);

// --- Pull Request Reviews ---
export const pullRequestReviews = pgTable(
  "pull_request_reviews",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    pullRequestId: bigint("pull_request_id", { mode: "number" })
      .notNull()
      .references(() => pullRequests.id),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    reviewer: text("reviewer"),
    state: text("state"), // APPROVED | CHANGES_REQUESTED | COMMENTED | DISMISSED
    submittedAt: timestamp("submitted_at"),
  },
  (t) => [
    index("prr_pr_idx").on(t.pullRequestId),
    index("prr_repo_idx").on(t.repositoryId),
    index("prr_submitted_at_idx").on(t.submittedAt),
  ],
);

// --- DX Pipeline Usages ---
export const dxPipelineUsages = pgTable(
  "dx_pipeline_usages",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    repository: text("repository").notNull(),
    callerFile: text("caller_file").notNull(),
    dxWorkflow: text("dx_workflow").notNull(),
    ref: text("ref"),
  },
  (t) => [
    uniqueIndex("dx_pipeline_repo_file_wf_idx").on(
      t.repository,
      t.callerFile,
      t.dxWorkflow,
    ),
  ],
);

// --- Terraform Modules ---
export const terraformModules = pgTable(
  "terraform_modules",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    repository: text("repository").notNull(),
    module: text("module").notNull(),
    filePath: text("file_path"),
    version: text("version"),
  },
  (t) => [
    uniqueIndex("tf_mod_repo_module_idx").on(
      t.repository,
      t.module,
      t.filePath,
    ),
  ],
);

// --- Terraform Registry Releases ---
export const terraformRegistryReleases = pgTable(
  "terraform_registry_releases",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    moduleName: text("module_name").notNull(),
    provider: text("provider").notNull(),
    majorVersion: integer("major_version").notNull(),
    firstReleaseVersion: text("first_release_version").notNull(),
    releaseDate: timestamp("release_date"),
    releasesCount: integer("releases_count"),
    latestVersion: text("latest_version"),
  },
  (t) => [
    uniqueIndex("tf_reg_mod_version_idx").on(
      t.moduleName,
      t.provider,
      t.majorVersion,
    ),
  ],
);

// --- Tracker Requests ---
export const trackerRequests = pgTable("tracker_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  submittedAt: timestamp("submitted_at"),
  closedAt: timestamp("closed_at"),
  category: text("category"),
  priority: text("priority"),
  isClosed: text("is_closed"),
  status: text("status"),
  rawSubmittedAt: text("raw_submitted_at"),
  rawClosedAt: text("raw_closed_at"),
});

// --- DX Team Members ---
export const dxTeamMembers = pgTable("dx_team_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
});

// --- Config ---
export const config = pgTable("config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// --- Sync Runs ---
export const syncRuns = pgTable("sync_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entityType: text("entity_type").notNull(),
  repositoryId: integer("repository_id").references(() => repositories.id),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  sinceDate: timestamp("since_date"),
  status: text("status").notNull().default("running"),
});
