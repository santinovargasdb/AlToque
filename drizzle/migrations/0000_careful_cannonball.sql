CREATE TYPE "public"."commission_source" AS ENUM('split', 'cash_debt');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('collected', 'owed', 'settled');--> statement-breakpoint
CREATE TYPE "public"."dispatch_status" AS ENUM('notified', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('requested', 'broadcasting', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('scheduled', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer', 'card');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('none', 'pending', 'held', 'released', 'paid_cash', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('client', 'provider', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"allows_urgent" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "commission_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"source" "commission_source" NOT NULL,
	"status" "commission_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "job_dispatch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"status" "dispatch_status" DEFAULT 'notified' NOT NULL,
	"distance_km" numeric,
	"notified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "uq_dispatch_job_provider" UNIQUE("job_id","provider_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"provider_id" uuid,
	"category_id" uuid NOT NULL,
	"type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'requested' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"photos" text[],
	"address_text" text,
	"location" geography(Point, 4326),
	"scheduled_at" timestamp with time zone,
	"payment_method" "payment_method" NOT NULL,
	"price_estimate" numeric(12, 2),
	"final_price" numeric(12, 2),
	"commission_rate" numeric(4, 3) NOT NULL,
	"commission_amount" numeric(12, 2),
	"payment_status" "payment_status" DEFAULT 'none' NOT NULL,
	"mp_preference_id" text,
	"mp_payment_id" text,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "role" DEFAULT 'client' NOT NULL,
	"full_name" text,
	"phone" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_categories" (
	"provider_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "provider_categories_provider_id_category_id_pk" PRIMARY KEY("provider_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "provider_mp_tokens" (
	"provider_id" uuid PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "provider_profiles" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"bio" text,
	"years_experience" integer,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"id_document_url" text,
	"selfie_url" text,
	"base_location" geography(Point, 4326),
	"service_radius_km" integer DEFAULT 10 NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"rating_avg" numeric(2, 1) DEFAULT '0.0' NOT NULL,
	"jobs_completed" integer DEFAULT 0 NOT NULL,
	"mp_user_id" text,
	"mp_connected" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_review_job_author" UNIQUE("job_id","author_id")
);
--> statement-breakpoint
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_provider_id_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_dispatch" ADD CONSTRAINT "job_dispatch_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_dispatch" ADD CONSTRAINT "job_dispatch_provider_id_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_provider_id_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_provider_id_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_mp_tokens" ADD CONSTRAINT "provider_mp_tokens_provider_id_profiles_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_id_profiles_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dispatch_provider" ON "job_dispatch" USING btree ("provider_id","status");--> statement-breakpoint
CREATE INDEX "idx_jobs_status" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_jobs_client" ON "jobs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_provider" ON "jobs" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_messages_job" ON "messages" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_provider_online" ON "provider_profiles" USING btree ("is_online","verification_status");--> statement-breakpoint
CREATE INDEX "idx_reviews_target" ON "reviews" USING btree ("target_id");