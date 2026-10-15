ALTER TABLE "checkouts" ADD COLUMN "internal_note" text;--> statement-breakpoint
ALTER TABLE "checkouts" ADD COLUMN "ship_by" text;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "dashboard_state" jsonb;