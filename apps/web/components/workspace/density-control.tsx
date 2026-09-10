"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
export function DensityControl() {
  const [comfortable, setComfortable] = useState(false);
  const { text } = useI18n();
  useEffect(() => {
    const timer = setTimeout(() => { try { const value = localStorage.getItem("pharma-workspace-density") === "comfortable"; setComfortable(value); document.documentElement.dataset.workspaceDensity = value ? "comfortable" : "compact"; } catch { /* Nonessential preference. */ } }, 0);
    return () => clearTimeout(timer);
  }, []);
  return <button className="workspace-density" aria-pressed={comfortable} aria-label={text("Comfortable row spacing", "넉넉한 행 간격")} onClick={() => { const next = !comfortable; setComfortable(next); document.documentElement.dataset.workspaceDensity = next ? "comfortable" : "compact"; try { localStorage.setItem("pharma-workspace-density", next ? "comfortable" : "compact"); } catch { /* Usable without storage. */ } }}>{comfortable ? text("Comfortable", "넉넉하게") : text("Compact", "간결하게")}</button>;
}
