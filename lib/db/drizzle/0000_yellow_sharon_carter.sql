CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"officer_assigned" text NOT NULL,
	"suspect_ids" text,
	"evidence" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"complainant_name" text NOT NULL,
	"contact_info" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'uncategorized' NOT NULL,
	"urgency" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"keywords" text,
	"ai_summary" text,
	"linked_case_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suspects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alias" text,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"national_id" text,
	"known_associates" text,
	"social_media_profiles" text,
	"notes" text,
	"case_ids" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text NOT NULL,
	"linked_case_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "osint_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"target" text NOT NULL,
	"target_type" text NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"summary" text NOT NULL,
	"flags" text DEFAULT '[]' NOT NULL,
	"suspicious_activity" text DEFAULT '[]' NOT NULL,
	"network_connections" text DEFAULT '[]' NOT NULL,
	"recommendation" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crime_hotspots" (
	"id" serial PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"district" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"incident_count" integer DEFAULT 0 NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"primary_crime_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crime_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"crime_type" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"change_percent" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;