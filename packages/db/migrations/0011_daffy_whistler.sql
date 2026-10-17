ALTER TYPE "public"."refund_status" ADD VALUE 'handoff';--> statement-breakpoint
ALTER TABLE "captures" ADD COLUMN "payee_merchant_id" text;--> statement-breakpoint
ALTER TABLE "checkouts" ADD COLUMN "payee_email" text;--> statement-breakpoint
ALTER TABLE "checkouts" ADD COLUMN "payee_merchant_id" text;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD COLUMN "refunded_cents" integer;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD COLUMN "handoff_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "payout_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "payout_email" text;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "payout_verified_at" timestamp with time zone;--> statement-breakpoint
-- Phase 9 (D-083): the platform account's own sellers keep paying into it; every other seller starts at none until connected.
UPDATE "sellers" SET "payout_status" = 'platform' WHERE "handle" IN ('juniper_clay', 'judge_demo');
