import { NextResponse, type NextRequest } from "next/server";
import {
  createVisitorSession, readVisitorSession, visitorCookieName, VISITOR_SESSION_SECONDS,
} from "@/lib/visitor-session";

export async function proxy(request: NextRequest) {
  const name = visitorCookieName();
  const existing = request.cookies.get(name)?.value;
  const subject = await readVisitorSession(existing);
  const token = subject ? existing! : await createVisitorSession();
  // Forward the first cookie to Server Components before storing it in the browser.
  request.cookies.set(name, token);
  const requestHeaders = new Headers(request.headers);
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64");
  const candidatePolicy = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}; object-src 'none'; base-uri 'self'; report-uri /api/csp-report`;
  // Next extracts the nonce from the request CSP for dynamically rendered scripts.
  // The existing enforced policy remains while this stricter policy is qualified.
  requestHeaders.set("Content-Security-Policy", candidatePolicy);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!request.nextUrl.pathname.startsWith("/api/")) response.headers.set("Content-Security-Policy-Report-Only", candidatePolicy);
  response.headers.set("Cache-Control", "private, no-store");
  if (!subject) {
    response.cookies.set(name, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/", maxAge: VISITOR_SESSION_SECONDS,
    });
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api/health(?:/|$)|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)",
  ],
};
