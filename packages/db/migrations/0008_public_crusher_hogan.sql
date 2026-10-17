ALTER TABLE "checkouts" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "events_public" ON "events" USING btree ("is_test","id");