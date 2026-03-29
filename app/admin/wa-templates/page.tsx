// app/admin/wa-templates/page.tsx
import {
  getWaTemplateSettings,
  getWaStatusTemplates,
} from "@/lib/actions/wa-templates";
import { WaTemplateEditor } from "@/components/admin/WaTemplateEditor";

export default async function WaTemplatesPage() {
  const [settings, statusTemplates] = await Promise.all([
    getWaTemplateSettings(),
    getWaStatusTemplates(),
  ]);

  if (!settings) {
    return (
      <div className="px-4 py-8">
        <p className="text-sm text-red-600 font-semibold">
          WhatsApp template settings not found. Please run the seed script first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pb-8 pt-2">
      <div>
        <h1
          className="font-black text-lg tracking-tight"
          style={{ color: "#1e293b" }}
        >
          WhatsApp Message Templates
        </h1>
        <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
          Customize the messages sent to customers when their order status
          changes.
        </p>
      </div>

      <WaTemplateEditor
        settings={settings}
        statusTemplates={statusTemplates}
      />
    </div>
  );
}