"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { GitBranch } from "@/components/icons/GitBranch";
import { Search } from "@/components/icons/Search";
import { ShieldCheck } from "@/components/icons/ShieldCheck";
import { agentDefinitions } from "@/lib/agent-workspace";
import type { ExampleSummary } from "@/lib/example-types";
import { ExamplePreview } from "@/components/examples/example-preview";
import { useI18n } from "@/lib/i18n";
import { SelectionGroup, SelectionIndicator } from "../motion/selection";
import { useContextArrival } from "../motion/use-context-arrival";
import styles from "./agent-team.module.css";

const sampleSlugs: Record<string, string> = { "case-orchestrator": "case-plan", "regulatory-evidence-agent": "regulatory-evidence", "internal-knowledge-agent": "internal-knowledge", "impact-analysis-agent": "impact-analysis", "verification-agent": "verification" };

export function AgentTeam({ examples }: { examples: ExampleSummary[] }) {
  const { text } = useI18n();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>(agentDefinitions[0].key);
  const pick = (pair: readonly [string, string]) => text(pair[0], pair[1]);
  const agents = agentDefinitions.filter((agent) =>
    [...agent.name, ...agent.role, agent.key]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  const active = agents.find((agent) => agent.key === selected) ?? agents[0];
  const sample = examples.find(example => example.slug === sampleSlugs[active?.key ?? ""]);
  const detailRef = useContextArrival<HTMLElement>(active?.key ?? "", true);
  return (
    <div className={styles.page}>
      <header>
        <div className={styles.kicker}>
          <GitBranch size={16} />
          {text("The specialist team", "전문 에이전트 팀")}
        </div>
        <h1>
          {text(
              "Specialists, in action.",
              "전문 에이전트의 실제 결과",
          )}
        </h1>
        <p>
          {text(
            "Reference runs · Automatic specialist execution is unavailable.",
            "참조 실행 결과 · 전문 에이전트 자동 실행은 아직 제공하지 않습니다.",
          )}
        </p>
      </header>
      <div className={styles.toolbar}>
        <label>
          <Search size={16} />
          <span className="sr-only">
            {text("Search agents", "에이전트 검색")}
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text(
              "Find a specialist or responsibility",
              "전문가 또는 역할 검색",
            )}
            type="search"
          />
        </label>
        <span>
          {agents.length} {text("specialists", "개 에이전트")}
        </span>
      </div>
      <div className={styles.workspace}>
        <SelectionGroup><nav
          aria-label={text("Agent definitions", "에이전트 정의")}
          className={styles.roster}
        >
          {agents.map((agent, index) => (
            <button
              className="ui-selection-control"
              key={agent.key}
              type="button"
              aria-pressed={active?.key === agent.key}
              aria-controls="agent-detail"
              onClick={() => setSelected(agent.key)}
            >
              {active?.key === agent.key ? <SelectionIndicator /> : null}
              <span className={styles.avatar}>
                <GitBranch size={19} />
              </span>
              <span className={styles.identity}>
                <strong>{pick(agent.name)}</strong>
                <small>
                  v{agent.version} · {text("Definition", "정의")}
                </small>
              </span>
              <ArrowRight size={15} />
              <span className={styles.order}>{index + 1}</span>
            </button>
          ))}
          {!agents.length ? (
            <p className={styles.empty}>
              {text(
                "No agents match your search. Try evidence, knowledge, or verification.",
                "검색 결과가 없습니다. 근거, 지식, 검증 등의 키워드로 검색하세요.",
              )}
            </p>
          ) : null}
        </nav></SelectionGroup>
        {active ? (
          <section
            id="agent-detail"
            ref={detailRef}
            className={styles.detail}
            aria-live="polite"
          >
            <span className={styles.definition}>
              v{active.version} / {text("Agent definition", "에이전트 정의")}
            </span>
            <h2>{pick(active.name)}</h2>
            {sample && <ExamplePreview example={sample} />}
            <details className={styles.definitionDetails}>
            <summary>{text("Role, input & tools", "역할, 입력 및 도구")}</summary>
            <p>{pick(active.role)}</p>
            <dl>
              <div>
                <dt>{text("Input", "입력")}</dt>
                <dd>{pick(active.input)}</dd>
              </div>
              <div>
                <dt>{text("Expected output", "예정된 출력")}</dt>
                <dd>{pick(active.output)}</dd>
              </div>
              <div>
                <dt>
                  {text("Tools in the review workflow", "검토 워크플로의 도구")}
                </dt>
                <dd>{pick(active.tools)}</dd>
              </div>
            </dl>
            <div className={styles.boundary}>
              <ShieldCheck size={20} />
              <p>
                {text(
                  "Agent outputs support a review. They do not determine compliance, approve a CAPA, or change a controlled document.",
                  "에이전트 결과는 검토를 지원합니다. 준수 여부를 판단하거나 CAPA를 승인하거나 관리 문서를 변경하지 않습니다.",
                )}
              </p>
            </div>
            </details>
            <Link href="/requests">
              {text("Prepare a review request", "검토 요청 작성하기")}
              <ArrowRight size={16} />
            </Link>
            <details>
              <summary>{text("Definition identifier", "정의 식별자")}</summary>
              <code>
                {active.key}@{active.version}
              </code>
            </details>
          </section>
        ) : null}
      </div>
      <footer>
        <span>
          {text(
            "Execution and release status are tracked separately.",
            "실행 및 릴리스 상태는 별도로 관리됩니다.",
          )}
        </span>
        <Link href="/control-tower">
          {text("Open agent operations", "에이전트 운영 현황 열기")}
          <ArrowRight size={15} />
        </Link>
      </footer>
    </div>
  );
}
