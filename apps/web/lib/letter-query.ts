import type { Letter } from "./types";

export const filterKeys = ["query", "subtype", "category", "country", "lifecycle", "review", "document", "postedFrom", "postedTo"] as const;
export type LetterFilters = Record<typeof filterKeys[number], string>;
export type LetterQuery = { filters: LetterFilters; page: number; pageSize: number; sort: "posted-desc" | "posted-asc" | "issued-desc" | "company-asc" };
export type LetterPage = { items: Letter[]; total: number; collectionTotal: number; page: number; pageSize: number; facets: Record<string, Array<{ value: string; count: number }>> };

export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : "";
}

export function readLetterQuery(params: URLSearchParams): LetterQuery {
  const filters = Object.fromEntries(filterKeys.map(key => [key, (params.get(key === "query" ? "q" : key) ?? "").slice(0, key === "query" ? 500 : key === "country" ? 120 : 200)])) as LetterFilters;
  filters.postedFrom = validDate(filters.postedFrom);
  filters.postedTo = validDate(filters.postedTo);
  if (filters.postedFrom && filters.postedTo && filters.postedFrom > filters.postedTo) [filters.postedFrom, filters.postedTo] = [filters.postedTo, filters.postedFrom];
  if (!["", "response", "closeout", "open"].includes(filters.document)) filters.document = "";
  const page = Number(params.get("page"));
  const pageSize = Number(params.get("pageSize"));
  const sort = params.get("sort") ?? "";
  return { filters, page: Number.isSafeInteger(page) && page > 0 && page <= 1_000_000 ? page : 1,
    pageSize: [20, 50, 100].includes(pageSize) ? pageSize : 20,
    sort: ["posted-desc", "posted-asc", "issued-desc", "company-asc"].includes(sort) ? sort as LetterQuery["sort"] : "posted-desc" };
}

export function letterQueryString(query: LetterQuery, backend = false) {
  const params = new URLSearchParams();
  for (const key of filterKeys) if (query.filters[key]) {
    const name = key === "query" ? "q" : backend && key === "postedFrom" ? "posted_from" : backend && key === "postedTo" ? "posted_to" : key;
    params.set(name, query.filters[key]);
  }
  params.set("page", String(query.page));
  params.set(backend ? "page_size" : "pageSize", String(query.pageSize));
  params.set("sort", query.sort);
  return params.toString();
}

export function previewLetterPage(all: Letter[], query: LetterQuery): LetterPage {
  const facets: LetterPage["facets"] = {};
  for (const key of ["subtype", "category", "country", "lifecycle", "review", "document"]) {
    const counts = new Map<string, number>();
    for (const item of all) {
      const values = key === "subtype" ? item.drugSubtypes : key === "category" ? item.categories : key === "country" ? [item.country] : key === "lifecycle" ? [item.lifecycleState] : key === "review" ? [item.reviewState] : [item.hasResponse && "response", item.hasCloseout ? "closeout" : "open"].filter((v): v is string => Boolean(v));
      for (const value of new Set(values)) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    facets[key] = [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => ({ value, count }));
  }
  const f = query.filters;
  const items = all.filter(item => {
    const posted = item.postedDate || item.issueDate;
    return (!f.query || [item.company, item.subject, item.marcsCms, item.issuingOffice, ...item.categories, ...item.regulations].join(" ").toLowerCase().includes(f.query.toLowerCase())) &&
      (!f.subtype || item.drugSubtypes.includes(f.subtype)) && (!f.category || item.categories.includes(f.category)) &&
      (!f.country || item.country === f.country) && (!f.lifecycle || item.lifecycleState === f.lifecycle) && (!f.review || item.reviewState === f.review) &&
      (!f.document || (f.document === "response" ? item.hasResponse : f.document === "closeout" ? item.hasCloseout : !item.hasCloseout)) &&
      (!f.postedFrom || posted >= f.postedFrom) && (!f.postedTo || posted <= f.postedTo);
  }).sort((a, b) => {
    const posted = (a.postedDate || a.issueDate).localeCompare(b.postedDate || b.issueDate);
    return (query.sort === "posted-asc" ? posted : query.sort === "issued-desc" ? b.issueDate.localeCompare(a.issueDate) : query.sort === "company-asc" ? a.company.localeCompare(b.company) : -posted) || a.id.localeCompare(b.id);
  });
  const page = Math.min(query.page, Math.max(1, Math.ceil(items.length / query.pageSize)));
  return { items: items.slice((page - 1) * query.pageSize, page * query.pageSize), total: items.length, collectionTotal: all.length, page, pageSize: query.pageSize, facets };
}
