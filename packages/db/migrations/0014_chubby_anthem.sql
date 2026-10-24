CREATE TABLE "gauntlet_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "gauntlet_runs_public" ON "gauntlet_runs" USING btree ("is_test","created_at");