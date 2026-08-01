// lib/utils/wa-message.ts
//
// Each order status has exactly ONE freeform WhatsApp message. Nothing is ever
// auto-appended to it — the admin's saved text for a status, after substituting
// any {{variable}} tokens, IS the entire outgoing message, verbatim.

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
