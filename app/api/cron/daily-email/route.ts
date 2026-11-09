// app/api/cron/daily-email/route.ts
import { NextResponse } from "next/server";
import { sendScheduledDailySummary } from "@/lib/actions/daily-email";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // At most one email per business day, even if several deployments fire.
  const result = await sendScheduledDailySummary();
  return NextResponse.json(result);
}