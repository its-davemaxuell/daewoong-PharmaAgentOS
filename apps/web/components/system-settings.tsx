"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { ServiceScope } from "@/components/agent-platform/service-scope";
import { useI18n } from "@/lib/i18n";
import styles from "./system-settings.module.css";

export function SystemSettings() {
  const { text } = useI18n();

  return (
    <article className={styles.settings}>
      <header>
        <h1>{text("Settings", "설정")}</h1>
        <p>{text("Preferences and guidance for all of PharmaAgent OS.", "PharmaAgent OS 전체에 적용되는 환경설정과 이용 안내입니다.")}</p>
      </header>

      <section className={styles.language} aria-labelledby="settings-language">
        <div>
          <h2 id="settings-language">{text("Interface language", "인터페이스 언어")}</h2>
          <p>{text("Choose the language used across the system. Your preference is saved in this browser.", "시스템 전체에서 사용할 언어를 선택하세요. 이 브라우저에 설정이 저장됩니다.")}</p>
        </div>
        <LanguageToggle />
      </section>

      <section aria-labelledby="settings-guide">
        <h2 id="settings-guide">{text("Help & guidance", "도움말 및 이용 안내")}</h2>
        <Link className={styles.guideLink} href="/help">
          <BookOpen size={24} aria-hidden="true" />
          <span>
            <strong>{text("Getting started", "이용 방법")}</strong>
            <small>{text("Learn where to chat, find warning letters, and start agent research.", "챗봇 대화, 경고서한 검색, 에이전트 리서치 시작 방법을 확인하세요.")}</small>
          </span>
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
      </section>

      <section aria-labelledby="settings-about">
        <h2 id="settings-about">{text("About this service", "서비스 안내")}</h2>
        <p>{text("FDA Warning Letter Chatbot brings together conversations and warning-letter sources. FDA AI Agent is your workspace for research goals, saved briefs, and review workflows.", "FDA 경고서한 챗봇에서 대화와 경고서한 자료를 함께 이용하세요. FDA AI 에이전트에서는 리서치 목표, 저장된 브리핑, 검토 워크플로를 관리할 수 있습니다.")}</p>
        <ServiceScope />
      </section>
    </article>
  );
}
