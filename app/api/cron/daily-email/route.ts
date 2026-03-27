// app/api/cron/daily-email/route.ts
import { NextResponse } from "next/server";
import { sendDailySummaryEmail } from "@/lib/actions/daily-email";

// Protect with a secret so only your scheduler can call it
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDailySummaryEmail();
  return NextResponse.json(result);
}

// vercel.json cron example:
// { "crons": [{ "path": "/api/cron/daily-email?secret=YOUR_SECRET", "schedule": "0 20 * * *" }] }