ALTER TABLE "agent_runs" ADD COLUMN "replay_key" text;--> statement-breakpoint
CREATE INDEX "agent_runs_replay_key" ON "agent_runs" USING btree ("replay_key");