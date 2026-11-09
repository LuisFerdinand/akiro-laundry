CREATE TABLE "daily_email_log" (
	"day" text PRIMARY KEY NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL
);
