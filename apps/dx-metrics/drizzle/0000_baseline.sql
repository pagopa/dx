CREATE TABLE "code_search_results" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "code_search_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"query" text NOT NULL,
	"repository_full_name" text NOT NULL,
	"path" text,
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commits" (
	"sha" text PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"repository_full_name" text NOT NULL,
	"author" text,
	"committer" text,
	"committer_date" timestamp,
	"message" text
);
--> statement-breakpoint
CREATE TABLE "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dx_pipeline_usages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dx_pipeline_usages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"repository" text NOT NULL,
	"caller_file" text NOT NULL,
	"dx_workflow" text NOT NULL,
	"ref" text
);
--> statement-breakpoint
CREATE TABLE "dx_team_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dx_team_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	CONSTRAINT "dx_team_members_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "iac_pr_lead_times" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "iac_pr_lead_times_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"repository_id" integer NOT NULL,
	"repository_full_name" text NOT NULL,
	"pr_number" integer NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"created_at" timestamp,
	"merged_at" timestamp,
	"lead_time_days" numeric,
	"target_authors" text[]
);
--> statement-breakpoint
CREATE TABLE "pull_request_reviews" (
	"id" bigint PRIMARY KEY NOT NULL,
	"pull_request_id" bigint NOT NULL,
	"repository_id" integer NOT NULL,
	"reviewer" text,
	"state" text,
	"submitted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pull_requests" (
	"id" bigint PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"review_decision" text,
	"created_at" timestamp,
	"closed_at" timestamp,
	"merged_at" timestamp,
	"merged_by" text,
	"additions" integer,
	"total_comments_count" integer,
	"draft" integer
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"organization" text NOT NULL,
	CONSTRAINT "repositories_full_name_unique" UNIQUE("full_name")
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sync_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entity_type" text NOT NULL,
	"repository_id" integer,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"since_date" timestamp,
	"status" text DEFAULT 'running' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terraform_modules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "terraform_modules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"repository" text NOT NULL,
	"module" text NOT NULL,
	"file_path" text,
	"version" text
);
--> statement-breakpoint
CREATE TABLE "terraform_registry_releases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "terraform_registry_releases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"module_name" text NOT NULL,
	"provider" text NOT NULL,
	"major_version" integer NOT NULL,
	"first_release_version" text NOT NULL,
	"release_date" timestamp,
	"releases_count" integer,
	"latest_version" text
);
--> statement-breakpoint
CREATE TABLE "tracker_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tracker_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"submitted_at" timestamp,
	"closed_at" timestamp,
	"category" text,
	"priority" text,
	"is_closed" text,
	"status" text,
	"raw_submitted_at" text,
	"raw_closed_at" text
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" bigint PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"workflow_id" bigint NOT NULL,
	"conclusion" text,
	"status" text,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" bigint PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"name" text NOT NULL,
	"pipeline" text
);
--> statement-breakpoint
ALTER TABLE "commits" ADD CONSTRAINT "commits_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iac_pr_lead_times" ADD CONSTRAINT "iac_pr_lead_times_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_reviews" ADD CONSTRAINT "pull_request_reviews_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_request_reviews" ADD CONSTRAINT "pull_request_reviews_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "code_search_query_repo_path_idx" ON "code_search_results" USING btree ("query","repository_full_name","path");--> statement-breakpoint
CREATE INDEX "commit_repo_idx" ON "commits" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "commit_date_idx" ON "commits" USING btree ("committer_date");--> statement-breakpoint
CREATE INDEX "commit_author_idx" ON "commits" USING btree ("author");--> statement-breakpoint
CREATE UNIQUE INDEX "dx_pipeline_repo_file_wf_idx" ON "dx_pipeline_usages" USING btree ("repository","caller_file","dx_workflow");--> statement-breakpoint
CREATE UNIQUE INDEX "iac_pr_repo_number_idx" ON "iac_pr_lead_times" USING btree ("repository_id","pr_number");--> statement-breakpoint
CREATE INDEX "iac_pr_created_at_idx" ON "iac_pr_lead_times" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prr_pr_idx" ON "pull_request_reviews" USING btree ("pull_request_id");--> statement-breakpoint
CREATE INDEX "prr_repo_idx" ON "pull_request_reviews" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "prr_submitted_at_idx" ON "pull_request_reviews" USING btree ("submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pr_repo_number_idx" ON "pull_requests" USING btree ("repository_id","number");--> statement-breakpoint
CREATE INDEX "pr_created_at_idx" ON "pull_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pr_merged_at_idx" ON "pull_requests" USING btree ("merged_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tf_mod_repo_module_idx" ON "terraform_modules" USING btree ("repository","module","file_path");--> statement-breakpoint
CREATE UNIQUE INDEX "tf_reg_mod_version_idx" ON "terraform_registry_releases" USING btree ("module_name","provider","major_version");--> statement-breakpoint
CREATE INDEX "wr_repo_idx" ON "workflow_runs" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "wr_created_at_idx" ON "workflow_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wr_workflow_idx" ON "workflow_runs" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "wf_repo_idx" ON "workflows" USING btree ("repository_id");