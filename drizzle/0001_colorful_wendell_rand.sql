ALTER TABLE "receipt_settings" ADD COLUMN "payment_paid_template" text DEFAULT 'Payment: {{paymentMethod}}
Amount Paid: {{amountPaid}}
Change: {{change}}' NOT NULL;--> statement-breakpoint
ALTER TABLE "receipt_settings" ADD COLUMN "receipt_template" text DEFAULT '*{{shopName}}*
{{shopTagline}}
{{divider}}
Order: {{orderNumber}}
Date    : {{date}}
Customer: {{customerName}}
Phone   : {{customerPhone}}
Address : {{customerAddress}}
{{divider}}
{{items}}
{{divider}}
*TOTAL: {{totalPrice}}*
{{divider}}
{{paymentLine}}
{{divider}}
Note:
{{notes}}
{{divider}}
Thank you for choosing {{shopName}}!
{{footerContact}}' NOT NULL;