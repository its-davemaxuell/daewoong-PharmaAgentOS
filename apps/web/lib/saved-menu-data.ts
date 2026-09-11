import "server-only";
import { getLetters, getSavedViews } from "./api-client";
import { bookmarkLetterId } from "./letter-bookmarks";
import type { SavedLetterEntry } from "@/components/saved-views-workspace";

export async function getSavedMenuData() {
  const [letters, views] = await Promise.all([getLetters(), getSavedViews()]);
  const byId = new Map(letters.data.map(letter => [letter.id, letter]));
  const entries = views.data.reduce<SavedLetterEntry[]>((saved, view) => {
    const id = bookmarkLetterId(view);
    const letter = id ? byId.get(id) : undefined;
    if (letter) saved.push({ letter, savedAt: view.updatedAt });
    return saved;
  }, []);
  const mode: "live" | "seeded" = letters.mode === "live" && views.mode === "live" ? "live" : "seeded";
  return { entries, mode };
}
