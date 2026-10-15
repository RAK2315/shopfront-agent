CREATE TABLE "demo_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "demo_reset_at" timestamp with time zone;