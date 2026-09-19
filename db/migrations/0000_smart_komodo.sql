CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barber_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text NOT NULL,
	"start_datetime" timestamp with time zone NOT NULL,
	"end_datetime" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"source" text DEFAULT 'online' NOT NULL,
	"management_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_management_token_unique" UNIQUE("management_token")
);
--> statement-breakpoint
CREATE TABLE "barber_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barber_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time,
	"end_time" time,
	"is_off" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"bio" text,
	"photo_url" text,
	"specialties" text[],
	"buffer_minutes" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "barbers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blocked_times" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barber_id" uuid,
	"start_datetime" timestamp with time zone NOT NULL,
	"end_datetime" timestamp with time zone NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "staff_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'staff' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "staff_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barber_schedules" ADD CONSTRAINT "barber_schedules_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_accounts" ADD CONSTRAINT "staff_accounts_user_id_staff_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_user_id_staff_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;