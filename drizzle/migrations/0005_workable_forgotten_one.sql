CREATE TYPE "public"."review_aspect" AS ENUM('punctuality', 'quality', 'communication', 'price', 'respect', 'availability', 'clarity', 'payment');--> statement-breakpoint
CREATE TABLE "review_aspects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"aspect" "review_aspect" NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "uq_review_aspect" UNIQUE("review_id","aspect")
);
--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "rating" SET DATA TYPE numeric(2, 1);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "rating_avg" numeric(2, 1) DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "review_aspects" ADD CONSTRAINT "review_aspects_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_review_aspects_review" ON "review_aspects" USING btree ("review_id");
