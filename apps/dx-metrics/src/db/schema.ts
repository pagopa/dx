import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
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
    id: bigint("id", { mode: "number" }).primaryKey(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id),
    status: text("status"),
    updatedAt: timestamp("updated_at"),
    workflowId: bigint("workflow_id", { mode: "number" })
      .notNull()
      .references(() => workflows.id),
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

// --- Better Auth Tables ---

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));
