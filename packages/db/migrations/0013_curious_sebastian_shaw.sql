ALTER TYPE "public"."checkout_status" ADD VALUE 'authorized' BEFORE 'capture_pending';--> statement-breakpoint
ALTER TYPE "public"."event_actor" ADD VALUE 'cart_api';--> statement-breakpoint
CREATE TABLE "carts" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"client" text NOT NULL,
	"status" text NOT NULL,
	"validation_status" text NOT NULL,
	"request" jsonb NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"totals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checkout_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "checkouts" ADD COLUMN "intent" text DEFAULT 'CAPTURE' NOT NULL;--> statement-breakpoint
ALTER TABLE "checkouts" ADD COLUMN "paypal_authorization_id" text;--> statement-breakpoint
ALTER TABLE "checkouts" ADD COLUMN "authorized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "checkouts" ADD COLUMN "authorization_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "checkouts" ADD COLUMN "stock_reserved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_checkout_id_checkouts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "carts_seller" ON "carts" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "carts_checkout" ON "carts" USING btree ("checkout_id");