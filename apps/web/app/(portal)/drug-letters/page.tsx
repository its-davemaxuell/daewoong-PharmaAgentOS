import type { Metadata } from "next";
import { getLetterPage, getSavedViews } from "@/lib/api-client";
import { readLetterQuery, letterQueryString } from "@/lib/letter-query";
import { LettersExplorer } from "@/components/letters-explorer";
import { bookmarkedLetterIds } from "@/lib/letter-bookmarks";

export const metadata: Metadata = { title: "의약품 경고서한 | Drug Letters" };

export default async function DrugLettersPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (value) params.set(key, Array.isArray(value) ? value[0] : value);
  const query = readLetterQuery(params);
  const [page, saved] = await Promise.all([getLetterPage(query), getSavedViews()]);
  return <LettersExplorer key={letterQueryString(query)} initialPage={page.data}
    initialSavedLetterIds={bookmarkedLetterIds(saved.data)} mode={page.mode} initialState={query} />;
}
