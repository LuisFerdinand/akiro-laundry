// app/api/cron/daily-email/route.ts
import { NextResponse } from "next/server";
import { sendDailySummaryEmail } from "@/lib/actions/daily-email";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDailySummaryEmail();
  return NextResponse.json(result);
}