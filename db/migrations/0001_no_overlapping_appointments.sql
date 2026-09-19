CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "no_overlapping_appointments" EXCLUDE USING gist (
	"barber_id" WITH =,
	tstzrange("start_datetime", "end_datetime") WITH &&
) WHERE ("status" = 'confirmed');
