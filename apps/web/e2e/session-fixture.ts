import type { Page } from "@playwright/test";
import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";

export async function retainFixtureSession(page: Page) {
  // Production uses a Secure __Host cookie. WebKit correctly refuses that cookie
  // on this HTTP-only loopback server, so inject a valid fixture session header.
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(`anonymous:${randomUUID()}`).setIssuer("pharmaagent-os-browser").setAudience("pharmaagent-os-browser").setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode("fixture-only-not-for-production-".repeat(2)));
  await page.route("http://127.0.0.1:3100/**", async route => {
    const request = route.request();
    // route.continue cannot override the browser's Cookie header. Use the API
    // transport for document/data/action requests; leave speculative RSC streams
    // in the browser so prefetching retains its normal streaming behavior.
    if (request.resourceType() !== "document" && request.method() !== "POST" && !new URL(request.url()).pathname.startsWith("/api/")) return route.continue();
    const headers = route.request().headers();
    const cookies = (headers.cookie || "").split(";").filter(value => value.trim() && !value.trim().startsWith("__Host-pharma-visitor="));
    cookies.push(`__Host-pharma-visitor=${token}`);
    const response = await route.fetch({ headers: { ...headers, cookie: cookies.join("; ") } });
    return route.fulfill({ response });
  });
}
