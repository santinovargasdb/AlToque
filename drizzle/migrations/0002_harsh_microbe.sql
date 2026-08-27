DROP TABLE "commission_ledger" CASCADE;--> statement-breakpoint
DROP TABLE "provider_mp_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "price_estimate";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "commission_rate";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "commission_amount";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "payment_status";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "mp_preference_id";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "mp_payment_id";--> statement-breakpoint
ALTER TABLE "provider_profiles" DROP COLUMN "mp_user_id";--> statement-breakpoint
ALTER TABLE "provider_profiles" DROP COLUMN "mp_connected";--> statement-breakpoint
DROP TYPE "public"."commission_source";--> statement-breakpoint
DROP TYPE "public"."commission_status";--> statement-breakpoint
DROP TYPE "public"."payment_status";