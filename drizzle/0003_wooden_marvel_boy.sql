ALTER TABLE "wa_template_settings" ADD COLUMN "order_detail_body" text DEFAULT '📌 *N.º Pedidu:*  {{orderNumber}}
👕 *Servisu:*     {{servicesSummary}}
📦 *Status:*      *{{statusLabel}}*
💰 *Total:*       {{totalPrice}}
{{paymentLine}}' NOT NULL;