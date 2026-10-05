CREATE TYPE "public"."review_aspect" AS ENUM('punctuality', 'quality', 'communication', 'price', 'respect', 'availability', 'clarity', 'payment');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('provider_monthly', 'client_monthly');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending', 'active', 'past_due', 'paused', 'cancelled');--> statement-breakpoint
CREATE TABLE "review_aspects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"aspect" "review_aspect" NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "uq_review_aspect" UNIQUE("review_id","aspect")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"plan" "subscription_plan" NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"mp_preapproval_id" text,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_profile_id_plan_unique" UNIQUE("profile_id","plan")
);
--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "rating" SET DATA TYPE numeric(2, 1);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "rating_avg" numeric(2, 1) DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "subscription_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "review_aspects" ADD CONSTRAINT "review_aspects_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_review_aspects_review" ON "review_aspects" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_mp_preapproval" ON "subscriptions" USING btree ("mp_preapproval_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_profile" ON "subscriptions" USING btree ("profile_id");