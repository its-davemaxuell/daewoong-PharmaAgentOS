import "server-only";
import catalog from "@/content/examples/catalog.json";
import type { PublicExample, ExampleSummary } from "./example-types";

// This build-time catalog contains only deliberately published demonstration runs.
// It has no access to the history API, session cookies, or the application database.
export const publicExamples = catalog as PublicExample[];
export function exampleSummaries(): ExampleSummary[] {
  return publicExamples.map(example => ({
    slug: example.slug, title: example.title, description: example.description,
    group: example.group, origin: example.origin, language: example.language,
    executedAt: example.executedAt, status: example.status, method: example.method,
    recordId: example.recordId, download: example.download, sourceCount: example.sources.length,
  }));
}
