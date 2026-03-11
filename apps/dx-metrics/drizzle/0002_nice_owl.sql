CREATE TABLE "tech_radar_usages" (
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"evidence_path" text,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tech_radar_usages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"radar_ref" text,
	"radar_ring" text,
	"radar_slug" text,
	"radar_status" text NOT NULL,
	"radar_title" text,
	"repository_full_name" text NOT NULL,
	"repository_id" integer NOT NULL,
	"search_query" text NOT NULL,
	"tool_key" text NOT NULL,
	"tool_name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tech_radar_usages" ADD CONSTRAINT "tech_radar_usages_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tech_radar_repository_idx" ON "tech_radar_usages" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "tech_radar_status_idx" ON "tech_radar_usages" USING btree ("radar_status");--> statement-breakpoint
CREATE UNIQUE INDEX "tech_radar_repo_tool_idx" ON "tech_radar_usages" USING btree ("repository_full_name","tool_key");