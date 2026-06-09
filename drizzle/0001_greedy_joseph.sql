CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"provider_name" varchar(255) NOT NULL,
	"contact_number" varchar(50) NOT NULL,
	"address" text,
	"city" varchar(120) NOT NULL,
	"description" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;