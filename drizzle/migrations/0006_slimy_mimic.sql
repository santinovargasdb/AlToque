CREATE TYPE "public"."report_reason" AS ENUM('no_show', 'not_completed', 'theft_or_damage', 'bad_behavior', 'payment', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "job_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"description" text NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"admin_note" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_reports_job_id_reporter_id_unique" UNIQUE("job_id","reporter_id")
);
--> statement-breakpoint
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_target_id_profiles_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_reports" ADD CONSTRAINT "job_reports_resolved_by_profiles_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_reports_status" ON "job_reports" USING btree ("status");--> statement-breakpoint
-- Sin policies a propósito: los reportes se leen y escriben solo desde el servidor.
ALTER TABLE "job_reports" ENABLE ROW LEVEL SECURITY;