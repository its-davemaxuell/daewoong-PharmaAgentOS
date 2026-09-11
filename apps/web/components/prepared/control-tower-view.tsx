"use client";
import Link from "next/link";
import type { MenuData } from "@/lib/menu-data-types";
import { BilingualText as T } from "@/lib/i18n";
import { RuntimeControlForm } from "@/components/agent-platform/runtime-control-form";
import styles from "@/components/agent-platform/governance.module.css";


function MetricGroup({ title, values }: { title: string; values: Record<string, number> }) {
  return (
    <section className={styles.metricGroup}>
      <span>{title}</span>
      <dl>
        {Object.entries(values).map(([key, value]) => (
          <div key={key}>
            <dt>{key.replaceAll("_", " ")}</dt>
            <dd>{Number.isInteger(value) ? value : value.toFixed(3)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function OperationsView({ value }: { value: MenuData["control-tower"] }) {
  const { tower, inventory, controls, canReadControls, canOperateControls } = value;
    const agents = inventory.filter((item) => item.kind === "AGENT_VERSION");
    const controlledAgentIds = new Set(
      controls.flatMap((control) => control.agentVersionId ? [control.agentVersionId] : []),
    );
    const availableAgents = agents.filter((agent) => !controlledAgentIds.has(agent.id));
    const globalControl = controls.find((control) => control.scope === "GLOBAL");
  return (
      <div className={styles.page}>
        <header>
          <span><T en="Governed operations" ko="운영 관리" /></span>
          <h1><T en="Operations" ko="운영" /></h1>
          <p>Generated {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(tower.generatedAt))}. Metrics are operational records, not regulatory conclusions.</p>
        </header>
        <div className={styles.metricGrid}>
          <MetricGroup title="Inventory" values={tower.inventory} />
          <MetricGroup title="Operational health" values={tower.operationalHealth} />
          <MetricGroup title="Quality" values={tower.quality} />
          <MetricGroup title="Security" values={tower.security} />
          <MetricGroup title="Cost and performance" values={tower.costPerformance} />
          <MetricGroup title="Business value" values={tower.businessValue} />
        </div>
        {canReadControls ? (
          <section className={styles.section}>
            <div className={styles.sectionHeading}><div><span>Runtime safety controls</span><h2>Global and exact-version suspension</h2></div></div>
            <p className={styles.sectionCopy}>Controls use optimistic revisions and immediately gate new runs, resume, workers, and MCP calls.</p>
            {canOperateControls ? (
              <div className={styles.controlGrid}>
                <RuntimeControlForm control={globalControl} />
                {controls.filter((control) => control.scope === "AGENT").map((control) => <RuntimeControlForm key={control.id} control={control} />)}
                {availableAgents.length ? <RuntimeControlForm availableAgents={availableAgents} /> : null}
              </div>
            ) : (
              <div className={styles.cardGrid}>{controls.map((control) => <article className={styles.card} key={control.id}><span>{control.scope}</span><h3>{control.controlKey}</h3><p>{control.suspended ? "Suspended" : "Active"} · revision {control.revision}</p></article>)}</div>
            )}
          </section>
        ) : null}
        <nav className="workspace-viewbar" aria-label="Related operations">
          <Link href="/evaluations"><T en="Agent evaluations" ko="에이전트 평가" /></Link>
          <Link href="/agents"><T en="Specialist agents" ko="전문 에이전트" /></Link>
        </nav>
        <section className={styles.section}>
          <div className={styles.sectionHeading}><div><span>Immutable inventory</span><h2>{inventory.length} <T en="registered versions" ko="개의 등록된 버전" /></h2></div></div>
          <div className={styles.inventoryTable}>{inventory.map((item) => <article key={item.id}><span>{item.kind.replaceAll("_", " ")}</span><strong>{item.key}@{item.version}</strong><code title={item.sha256}>{item.sha256.slice(0, 9)}…{item.sha256.slice(-9)}</code><em>{item.releaseStatus}</em></article>)}</div>
        </section>
      </div>
  );
}
