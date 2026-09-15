import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import catalog from "../content/examples/catalog.json";
import type { PublicExample } from "../lib/example-types";

const examples = catalog as PublicExample[];
describe("published pipeline examples", () => {
  it("covers every result-producing service with a unique public record", () => {
    expect(new Set(examples.map(example => example.slug)).size).toBe(examples.length);
    expect(examples.length).toBeGreaterThanOrEqual(18);
    expect(new Set(examples.map(example => example.group))).toEqual(new Set(["workspace", "sources", "specialists", "governance"]));
    for (const example of examples) {
      expect(example.sections.length).toBeGreaterThan(0);
      expect(example.steps.length).toBeGreaterThan(0);
      expect(example.input.length).toBeGreaterThan(5);
      const sourceIds = new Set(example.sources.map(source => source.id));
      expect(sourceIds.size).toBe(example.sources.length);
      for (const section of example.sections) {
        for (const id of section.sourceIds || []) expect(sourceIds.has(id)).toBe(true);
      }
    }
  });

  it("binds every download to its displayed fingerprint without publishing private session data", () => {
    for (const example of examples) {
      expect(example.slug).toMatch(/^[a-z0-9-]+$/);
      expect(example.download).toBe(`/examples/${example.slug}.json`);
      const bytes = readFileSync(new URL(`../public/examples/${example.slug}.json`, import.meta.url));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(example.sha256);
      const snapshot = JSON.parse(bytes.toString());
      expect(snapshot.human_approved).toBe(false);
      expect(snapshot.synthetic_sources).toBe(example.origin === "reference");
      expect(snapshot.simulated_reviews).toBe(example.origin === "reference");
      expect(bytes.toString()).not.toMatch(/anonymous:|encrypted_content|private_key|session-cookies|Bearer /i);
    }
  });

  it("links only to official FDA sources and preserves truthful execution distinctions", () => {
    for (const example of examples) {
      for (const source of example.sources) {
        expect(source.excerpt.length).toBeGreaterThan(0);
        if (source.url) {
          const url = new URL(source.url);
          expect(url.protocol).toBe("https:");
          expect(["fda.gov", "www.fda.gov"]).toContain(url.hostname);
          expect(example.origin).toBe("live");
        }
      }
    }
    const evaluation = examples.find(example => example.slug === "evaluation")!;
    expect(evaluation.origin).toBe("reference");
    expect(evaluation.limitations.join(" ")).toContain("supplied fixtures");
    expect(examples.find(example => example.slug === "review-package")!.status).toContain("human review pending");
  });
});
