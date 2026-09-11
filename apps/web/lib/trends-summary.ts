import "server-only";
import { getDashboard, getLetters } from "./api-client";
function tally(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function countLetterLabels(values: string[][]) {
  return tally(values.flatMap((labels) => [...new Set(labels.filter(Boolean))]));
}

const dayMs = 86_400_000;

function localIsoDay(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getTrendsSummary(periodDays = 90) {
  const [dashboardResult, lettersResult] = await Promise.all([getDashboard(), getLetters()]);
  const { data } = dashboardResult;
  const letters = lettersResult.data;
  const mode: "live" | "seeded" = dashboardResult.mode === "live" && lettersResult.mode === "live" ? "live" : "seeded";

  const periodEnd = new Date();
  periodEnd.setHours(23, 59, 59, 999);
  const periodStart = new Date(periodEnd.getTime() - (periodDays - 1) * dayMs);
  periodStart.setHours(0, 0, 0, 0);
  const priorEnd = new Date(periodStart.getTime() - 1);
  const priorStart = new Date(priorEnd.getTime() - (periodDays - 1) * dayMs);
  priorStart.setHours(0, 0, 0, 0);

  const postedAt = (letter: (typeof letters)[number]) => new Date(
    `${letter.postedDate || letter.issueDate}T12:00:00`,
  ).getTime();
  const currentLetters = letters.filter(
    (letter) => postedAt(letter) >= periodStart.getTime() && postedAt(letter) <= periodEnd.getTime(),
  );
  const previousLetters = letters.filter(
    (letter) => postedAt(letter) >= priorStart.getTime() && postedAt(letter) <= priorEnd.getTime(),
  );

  const previousCategories = new Map(
    countLetterLabels(previousLetters.map((letter) => letter.categories)),
  );
  const categoryTrends = countLetterLabels(currentLetters.map((letter) => letter.categories))
    .slice(0, 5)
    .map(([label, value]) => ({
      label,
      value,
      previous: previousCategories.get(label) ?? 0,
    }));
  const previousRegulations = new Map(
    countLetterLabels(previousLetters.map((letter) => letter.regulations)),
  );
  const regulations = countLetterLabels(currentLetters.map((letter) => letter.regulations))
    .slice(0, 4)
    .map(([citation, count]) => ({
      citation,
      count,
      change: count - (previousRegulations.get(citation) ?? 0),
    }));
  const periodQuery = `postedFrom=${localIsoDay(periodStart)}&postedTo=${localIsoDay(periodEnd)}`;
  const letterDelta = currentLetters.length - previousLetters.length;
  const topTheme = categoryTrends[0];
  const maxTheme = Math.max(
    ...categoryTrends.flatMap((item) => [item.value, item.previous]),
    1,
  );
  const lastDiscovery = letters
    .map((letter) => letter.retrievedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? data.discovery.lastSuccess;

  // These labels describe the server's calendar boundaries used in periodQuery.
  // Send calendar dates so the browser's time zone cannot shift the final day.
  return { mode, data: { discovery: data.discovery }, periodDays, periodStart: localIsoDay(periodStart), periodEnd: localIsoDay(periodEnd), currentCount: currentLetters.length, categoryTrends, regulations, periodQuery, letterDelta, topTheme, maxTheme, lastDiscovery };
}
