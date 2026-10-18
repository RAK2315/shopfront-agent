CREATE TABLE "reconciliation_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"trigger" text NOT NULL,
	"ok" boolean NOT NULL,
	"matched" integer DEFAULT 0 NOT NULL,
	"mismatches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explained" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
