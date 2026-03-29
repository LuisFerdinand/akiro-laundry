CREATE TABLE "wa_status_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "order_status" NOT NULL,
	"body_template" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wa_status_templates_status_unique" UNIQUE("status")
);
--> statement-breakpoint
CREATE TABLE "wa_template_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_name" text DEFAULT 'Akiro Laundry' NOT NULL,
	"business_phone" text DEFAULT '+670 7675 8 7380' NOT NULL,
	"business_url" text DEFAULT 'akirolaundry.com' NOT NULL,
	"greeting_template" text DEFAULT 'Ola Sr/a *{{customerName}}*,
Ami husi *{{businessName}}* hakarak informa kona-ba ita-nia pedidu foun.' NOT NULL,
	"order_detail_header" text DEFAULT '🧾 *DETALLU PEDIDU*' NOT NULL,
	"footer_template" text DEFAULT '{{businessName}}
📞 {{businessPhone}}
🌐 {{businessUrl}}' NOT NULL,
	"review_cta_template" text DEFAULT '⭐ *Kontenti ho ami-nia servisu?*
Husik review ida iha: {{reviewUrl}}
Obrigadu barak! 🙏' NOT NULL,
	"payment_paid_template" text DEFAULT '✅ *Pagamentu:* Kompletu ona' NOT NULL,
	"payment_unpaid_template" text DEFAULT '⚠️ *Pagamentu:* Seidauk selu — favor prepara {{totalPrice}} bainhira mai foti' NOT NULL,
	"notes_section_header" text DEFAULT '📝 *NOTA ESPESIAL*' NOT NULL,
	"separator" text DEFAULT '─────────────────────────' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
