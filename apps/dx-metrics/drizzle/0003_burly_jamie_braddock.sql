ALTER TABLE "pull_requests" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
CREATE INDEX "pr_updated_at_idx" ON "pull_requests" USING btree ("updated_at");