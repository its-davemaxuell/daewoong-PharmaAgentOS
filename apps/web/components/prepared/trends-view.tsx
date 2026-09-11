"use client";
import { SelectionGroup, SelectionIndicator } from "@/components/motion/selection";
import Link from "next/link";
import { Activity } from "@/components/icons/Activity";
import { ArrowDownRight } from "@/components/icons/ArrowDownRight";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { ArrowUpRight } from "@/components/icons/ArrowUpRight";
import { CalendarRange } from "@/components/icons/CalendarRange";
import { FileWarning } from "@/components/icons/FileWarning";
import { Info } from "@/components/icons/Info";
import { Minus } from "@/components/icons/Minus";
import { Scale } from "@/components/icons/Scale";
import type { MenuData } from "@/lib/menu-data-types";
import { BilingualText } from "@/lib/i18n";
import { ModeBadge, PaperPanel, ScopeBadge } from "@/components/ui";

const trendKo: Record<string, string> = {
  "Quality Unit": "품질 부서",
  Investigations: "조사",
  Laboratory: "실험실 관리",
  Validation: "밸리데이션",
  "Data Integrity": "데이터 완전성",
  Manufacturing: "제조 관리",
  Microbiology: "미생물 관리",
  Sterility: "무균 관리",
};

function ko(value: string) {
  return trendKo[value] ?? value;
}

function formatServiceTimestamp(value: string, locale: "ko" | "en") {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(timestamp);
}

function periodLabel(start: Date, end: Date, locale: "ko" | "en") {
  const formatter = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(start)}–${formatter.format(end)}`;
}

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function DeltaIcon({ value }: { value: number }) {
  if (value > 0) return <ArrowUpRight size={14} aria-hidden="true" />;
  if (value < 0) return <ArrowDownRight size={14} aria-hidden="true" />;
  return <Minus size={14} aria-hidden="true" />;
}

export function TrendsView({ value }: { value: MenuData["trends"] }) {
  const { mode, data, periodDays, currentCount, categoryTrends, regulations, periodQuery, letterDelta, topTheme, maxTheme, lastDiscovery } = value;
  const periodStart = new Date(`${value.periodStart}T12:00:00`);
  const periodEnd = new Date(`${value.periodEnd}T12:00:00`);
  return (
    <div className="regulatory-monitoring regulatory-monitoring--signals">
      <div className="trend-brief">
      <header className="trend-brief__header dossier-reveal">
        <div className="trend-brief__title">
          <p><BilingualText en="Regulatory signal board" ko="규제 시그널 보드" /></p>
          <h1><BilingualText en="Trends" ko="동향" /></h1>
          <span>
            <BilingualText
              en={`FDA Drug warning-letter patterns · ${periodLabel(periodStart, periodEnd, "en")}`}
              ko={`FDA 의약품 경고서한 패턴 · ${periodLabel(periodStart, periodEnd, "ko")}`}
            />
          </span>
        </div>
        <div className="trend-brief__controls">
          <ScopeBadge compact />
          <ModeBadge mode={mode} />
          <SelectionGroup><nav className="trend-period-selector" aria-label="분석 기간 / Analytics period">
            <CalendarRange size={16} aria-hidden="true" />
            {[30, 90, 365].map((days) => (
              <Link
                className="ui-selection-control"
                key={days}
                aria-current={days === periodDays ? "page" : undefined}
                href={`/trends?days=${days}`}
              >
                {days === periodDays ? <SelectionIndicator /> : null}
                <BilingualText
                  en={days === 365 ? "1 year" : `${days} days`}
                  ko={days === 365 ? "1년" : `${days}일`}
                />
              </Link>
            ))}
          </nav></SelectionGroup>
        </div>
      </header>

      <section className="trend-signal-strip dossier-reveal dossier-reveal--delay-1" aria-label="핵심 규제 지표 / Essential regulatory indicators">
        <Link href={`/drug-letters?${periodQuery}`} className="trend-signal trend-signal--volume">
          <span className="trend-signal__icon"><FileWarning size={18} aria-hidden="true" /></span>
          <div>
            <small><BilingualText en="Letters in view" ko="기간 내 경고서한" /></small>
            <strong>{currentCount}</strong>
            <em className={letterDelta > 0 ? "is-rising" : letterDelta < 0 ? "is-falling" : ""}>
              <DeltaIcon value={letterDelta} />
              <BilingualText
                en={`${letterDelta > 0 ? "+" : ""}${letterDelta} vs prior period`}
                ko={`이전 기간 대비 ${letterDelta > 0 ? "+" : ""}${letterDelta}건`}
              />
            </em>
          </div>
        </Link>

        <Link
          href={topTheme ? `/drug-letters?category=${encodeURIComponent(topTheme.label)}&${periodQuery}` : `/drug-letters?${periodQuery}`}
          className="trend-signal trend-signal--theme"
        >
          <span className="trend-signal__icon"><Activity size={18} aria-hidden="true" /></span>
          <div>
            <small><BilingualText en="Leading GMP theme" ko="최다 GMP 주제" /></small>
            <strong><BilingualText en={topTheme?.label ?? "No coded theme"} ko={topTheme ? ko(topTheme.label) : "코딩된 주제 없음"} /></strong>
            <em>
              <BilingualText
                en={topTheme ? `${topTheme.value} letters · ${percentage(topTheme.value, currentCount)}% of period` : "No approved labels in this period"}
                ko={topTheme ? `${topTheme.value}건 · 기간 경고서한의 ${percentage(topTheme.value, currentCount)}%` : "이 기간에 승인된 라벨 없음"}
              />
            </em>
          </div>
        </Link>

      </section>

      <section className="trend-focus-grid dossier-reveal dossier-reveal--delay-2">
        <PaperPanel className="trend-theme-panel">
          <header className="trend-panel-heading">
            <div>
              <p><BilingualText en="01 · Recurring controls" ko="01 · 반복 관리 항목" /></p>
              <h2><BilingualText en="GMP themes to review" ko="검토가 필요한 GMP 주제" /></h2>
            </div>
            <span><BilingualText en="Current / prior" ko="현재 / 이전" /></span>
          </header>
          <div className="trend-theme-list" role="list" aria-label="현재 및 이전 기간 GMP 주제 건수 / Current and prior GMP theme counts">
            {categoryTrends.map((item) => {
              const delta = item.value - item.previous;
              return (
                <Link
                  key={item.label}
                  role="listitem"
                  href={`/drug-letters?category=${encodeURIComponent(item.label)}&${periodQuery}`}
                  className="trend-theme-row"
                >
                  <div className="trend-theme-row__label">
                    <strong><BilingualText en={item.label} ko={ko(item.label)} /></strong>
                    <small><BilingualText en={`${percentage(item.value, currentCount)}% of letters`} ko={`경고서한의 ${percentage(item.value, currentCount)}%`} /></small>
                  </div>
                  <div className="trend-theme-row__bars" aria-hidden="true">
                    <i className="trend-theme-row__current" style={{ width: `${(item.value / maxTheme) * 100}%` }} />
                    <i className="trend-theme-row__prior" style={{ width: `${(item.previous / maxTheme) * 100}%` }} />
                  </div>
                  <div className="trend-theme-row__value">
                    <strong>{item.value}</strong>
                    <small className={delta > 0 ? "is-rising" : delta < 0 ? "is-falling" : ""}>
                      {delta > 0 ? "+" : ""}{delta}
                    </small>
                  </div>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
          {!categoryTrends.length ? (
            <p className="trend-empty"><BilingualText en="No approved GMP theme labels are available for this period." ko="이 기간에 승인된 GMP 주제 라벨이 없습니다." /></p>
          ) : null}
          <footer className="trend-theme-legend">
            <span><i /> <BilingualText en="Current period" ko="현재 기간" /></span>
            <span><i /> <BilingualText en="Prior period" ko="이전 기간" /></span>
            <small><BilingualText en="One letter may carry multiple themes." ko="하나의 경고서한에 여러 주제가 포함될 수 있습니다." /></small>
          </footer>
        </PaperPanel>
      </section>

      <section className="trend-authority-rail dossier-reveal dossier-reveal--delay-3">
        <header>
          <div>
            <Scale size={17} aria-hidden="true" />
            <span><BilingualText en="Most cited authorities" ko="최다 인용 규정" /></span>
          </div>
          <small><BilingualText en="Frequency is a review cue, not a severity score." ko="빈도는 검토 신호이며 심각도 점수가 아닙니다." /></small>
        </header>
        <ol>
          {regulations.map((item, index) => (
            <li key={item.citation}>
              <Link href={`/drug-letters?q=${encodeURIComponent(item.citation)}&${periodQuery}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <code lang="en">{item.citation}</code>
                <strong><BilingualText en={`${item.count} letters`} ko={`${item.count}건`} /></strong>
                <em className={item.change > 0 ? "is-rising" : item.change < 0 ? "is-falling" : ""}>
                  {item.change > 0 ? "+" : ""}{item.change}
                </em>
              </Link>
            </li>
          ))}
        </ol>
        {!regulations.length ? (
          <p className="trend-empty"><BilingualText en="No cited authorities are available for this period." ko="이 기간에 집계된 인용 규정이 없습니다." /></p>
        ) : null}
      </section>

      <footer className="trend-provenance">
        <Info size={14} aria-hidden="true" />
        <p>
          <BilingualText
            en={`FDA Product: Drugs sources · approved labels · refreshed ${formatServiceTimestamp(lastDiscovery, "en")}`}
            ko={`FDA 의약품 원문 · 승인된 라벨 · ${formatServiceTimestamp(lastDiscovery, "ko")} 갱신`}
          />
        </p>
        <span><BilingualText en={`${data.discovery.exceptions} records withheld`} ko={`${data.discovery.exceptions}건 보류`} /></span>
      </footer>
      </div>
    </div>
  );
}
