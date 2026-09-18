import {
  bigint,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// --- Repositories ---
export const repositories = pgTable("repositories", {
  fullName: text("full_name").notNull().unique(),
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  organization: text("organization").notNull(),
});

// --- Pull Requests ---
export const pullRequests = pgTable(
  "pull_requests",
  {
    additions: integer("additions"),
    author: text("author"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at"),
    draft: integer("draft"), // 0: false, 1: true
    id: bigint("id", { mode: "number" }).primaryKey(),
    mergedAt: timestamp("merged_at"),
    mergedBy: text("merged_by"),
    number: integer("number").notNull(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    reviewDecision: text("review_decision"),
    title: text("title").notNull(),
    totalCommentsCount: integer("total_comments_count"),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    uniqueIndex("pr_repo_number_idx").on(t.repositoryId, t.number),
    index("pr_created_at_idx").on(t.createdAt),
    index("pr_merged_at_idx").on(t.mergedAt),
    index("pr_repo_merged_idx").on(t.repositoryId, t.mergedAt),
    index("pr_repo_closed_idx").on(t.repositoryId, t.closedAt),
    index("pr_updated_at_idx").on(t.updatedAt),
  ],
);

// --- Workflows ---
export const workflows = pgTable(
  "workflows",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    pipeline: text("pipeline"),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
  },
  (t) => [index("wf_repo_idx").on(t.repositoryId)],
);

// --- Workflow Runs ---
export const workflowRuns = pgTable(
  "workflow_runs",
  {
    conclusion: text("conclusion"),
    createdAt: timestamp("created_at"),
    /**
     * GitHub event that triggered the run (e.g. `push`, `pull_request`,
     * `schedule`, `workflow_dispatch`). Nullable because rows imported before
     * the column existed are only backfilled on a re-import.
     */
    event: text("event"),
    id: bigint("id", { mode: "number" }).primaryKey(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    status: text("status"),
    /**
     * Login of the user (or bot) whose action triggered the run. Nullable for
     * the same reason as `event`: rows imported before the column existed are
     * only backfilled on a re-import, and the dashboard degrades them to
     * "Unknown" instead of failing.
     */
    triggeringActor: text("triggering_actor"),
    updatedAt: timestamp("updated_at"),
    workflowId: bigint("workflow_id", { mode: "number" })
      .notNull()
      .references(() => workflows.id),
  },
  (t) => [
    index("wr_repo_idx").on(t.repositoryId),
    index("wr_created_at_idx").on(t.createdAt),
    index("wr_repo_updated_idx").on(t.repositoryId, t.updatedAt),
    index("wr_workflow_idx").on(t.workflowId),
  ],
);

// --- IaC PR Lead Times ---
export const iacPrLeadTimes = pgTable(
  "iac_pr_lead_times",
  {
    author: text("author"),
    createdAt: timestamp("created_at"),
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    leadTimeDays: numeric("lead_time_days"),
    mergedAt: timestamp("merged_at"),
    prNumber: integer("pr_number").notNull(),
    repositoryFullName: text("repository_full_name").notNull(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    targetAuthors: text("target_authors").array(),
    title: text("title").notNull(),
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
    author: text("author"),
    committer: text("committer"),
    committerDate: timestamp("committer_date"),
    message: text("message"),
    repositoryFullName: text("repository_full_name").notNull(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    sha: text("sha").primaryKey(),
  },
  (t) => [
    index("commit_repo_idx").on(t.repositoryId),
    index("commit_date_idx").on(t.committerDate),
    index("commit_author_idx").on(t.author),
    index("commit_author_date_idx").on(t.author, t.committerDate),
  ],
);

// --- Code Search Results ---
export const codeSearchResults = pgTable(
  "code_search_results",
  {
    fetchedAt: timestamp("fetched_at").defaultNow(),
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    path: text("path"),
    query: text("query").notNull(),
    repositoryFullName: text("repository_full_name").notNull(),
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
    index("prr_pr_submitted_idx").on(t.pullRequestId, t.submittedAt),
    index("prr_repo_idx").on(t.repositoryId),
    index("prr_submitted_at_idx").on(t.submittedAt),
  ],
);

// --- DX Pipeline Usages ---
export const dxPipelineUsages = pgTable(
  "dx_pipeline_usages",
  {
    callerFile: text("caller_file").notNull(),
    dxWorkflow: text("dx_workflow").notNull(),
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ref: text("ref"),
    repository: text("repository").notNull(),
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
    filePath: text("file_path"),
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    module: text("module").notNull(),
    repository: text("repository").notNull(),
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
    firstReleaseVersion: text("first_release_version").notNull(),
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    latestVersion: text("latest_version"),
    majorVersion: integer("major_version").notNull(),
    moduleName: text("module_name").notNull(),
    provider: text("provider").notNull(),
    releaseDate: timestamp("release_date"),
    releasesCount: integer("releases_count"),
  },
  (t) => [
    uniqueIndex("tf_reg_mod_version_idx").on(
      t.moduleName,
      t.provider,
      t.majorVersion,
    ),
  ],
);

// --- Techradar Tool Usages ---
export const techRadarUsages = pgTable(
  "tech_radar_usages",
  {
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    evidencePath: text("evidence_path"),
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    radarRef: text("radar_ref"),
    radarRing: text("radar_ring"),
    radarSlug: text("radar_slug"),
    radarStatus: text("radar_status").notNull(),
    radarTitle: text("radar_title"),
    repositoryFullName: text("repository_full_name").notNull(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    searchQuery: text("search_query").notNull(),
    toolKey: text("tool_key").notNull(),
    toolName: text("tool_name").notNull(),
  },
  (t) => [
    index("tech_radar_repository_idx").on(t.repositoryId),
    index("tech_radar_status_idx").on(t.radarStatus),
    uniqueIndex("tech_radar_repo_tool_idx").on(t.repositoryFullName, t.toolKey),
  ],
);

// --- Techradar Usage Snapshots ---
// Append-only history captured on every import run. `tech_radar_usages` is a
// per-repository upsert and cannot answer "how has adoption changed over time",
// so each run records the aggregated repository count per tool/ring/status.
export const techRadarSnapshots = pgTable(
  "tech_radar_snapshots",
  {
    capturedAt: timestamp("captured_at").defaultNow().notNull(),
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    radarRing: text("radar_ring"),
    radarStatus: text("radar_status").notNull(),
    repositoryCount: integer("repository_count").notNull(),
    toolKey: text("tool_key").notNull(),
    toolName: text("tool_name").notNull(),
  },
  (t) => [index("tr_snapshot_tool_time_idx").on(t.toolKey, t.capturedAt)],
);

// --- Tracker Requests ---
export const trackerRequests = pgTable("tracker_requests", {
  category: text("category"),
  closedAt: timestamp("closed_at"),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  isClosed: text("is_closed"),
  priority: text("priority"),
  rawClosedAt: text("raw_closed_at"),
  rawSubmittedAt: text("raw_submitted_at"),
  status: text("status"),
  submittedAt: timestamp("submitted_at"),
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
  completedAt: timestamp("completed_at"),
  entityType: text("entity_type").notNull(),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  repositoryId: integer("repository_id").references(() => repositories.id),
  sinceDate: timestamp("since_date"),
  startedAt: timestamp("started_at").defaultNow(),
  status: text("status").notNull().default("running"),
});
