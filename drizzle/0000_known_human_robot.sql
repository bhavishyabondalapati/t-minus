CREATE TABLE "api_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"body" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commutes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"route_id" text NOT NULL,
	"origin_stop_id" text NOT NULL,
	"origin_stop_name" text NOT NULL,
	"dest_stop_id" text NOT NULL,
	"dest_stop_name" text NOT NULL,
	"direction_id" integer NOT NULL,
	"walk_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delay_stats" (
	"route_id" text NOT NULL,
	"hour" integer NOT NULL,
	"avg_delay_sec" real NOT NULL,
	"on_time_pct" real NOT NULL,
	"samples" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delay_stats_route_id_hour_pk" PRIMARY KEY("route_id","hour")
);
--> statement-breakpoint
CREATE TABLE "prediction_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"prediction_id" text NOT NULL,
	"trip_id" text,
	"route_id" text NOT NULL,
	"stop_id" text NOT NULL,
	"direction_id" integer NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"predicted_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_at" timestamp with time zone,
	"actual_at" timestamp with time zone,
	"actual_source" text,
	"delay_sec" integer,
	"resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" integer NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "commutes" ADD CONSTRAINT "commutes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commutes_user_idx" ON "commutes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prediction_log_pid_idx" ON "prediction_log" USING btree ("prediction_id");--> statement-breakpoint
CREATE INDEX "prediction_log_open_idx" ON "prediction_log" USING btree ("resolved","predicted_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");