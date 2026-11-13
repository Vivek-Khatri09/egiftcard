import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** The customer cancelled or eSewa failed. Nothing is marked paid; the order stays open for a retry until it expires. */
export function GET(request: NextRequest) {
  return NextResponse.redirect(`${request.nextUrl.origin}/account/orders?payment=failed`);
}
