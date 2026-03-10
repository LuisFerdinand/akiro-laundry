// app/api/customers/lookup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { lookupCustomerByPhone } from "@/lib/actions/orders";

/**
 * GET /api/customers/lookup?phone=08123456789
 *
 * Returns the customer record if found, or { found: false } if not.
 */
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");

  if (!phone || phone.trim().length < 6) {
    return NextResponse.json(
      { found: false, error: "Nomor HP terlalu pendek." },
      { status: 400 }
    );
  }

  const customer = await lookupCustomerByPhone(phone);

  if (!customer) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, customer });
}