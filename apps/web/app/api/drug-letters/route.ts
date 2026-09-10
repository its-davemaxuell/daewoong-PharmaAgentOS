import { NextRequest, NextResponse } from "next/server";
import { getLetterPage } from "@/lib/api-client";
import { readLetterQuery } from "@/lib/letter-query";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getLetterPage(readLetterQuery(request.nextUrl.searchParams)), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "library_unavailable" }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
