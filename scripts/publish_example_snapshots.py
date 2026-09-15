"""Build the public example catalog from explicitly selected demonstration captures.

This is an offline publication step, not a public endpoint. No private history is
queried. Only these named runs and allowlisted live fields can be published.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / ".artifacts/pipeline-examples"
PUBLIC = ROOT / "apps/web/public/examples"
CATALOG = ROOT / "apps/web/content/examples/catalog.json"

META = {
    "chat-quality-unit": (
        "workspace",
        ["Quality-unit oversight, with citations", "근거로 확인하는 품질부서 감독"],
        [
            "Three company-specific observations and questions for reviewing your own records.",
            "회사별 관찰사항 3가지와 내부 기록 검토를 위한 질문입니다.",
        ],
    ),
    "chat-data-integrity-ko": (
        "workspace",
        ["A Korean data-integrity answer", "한국어 데이터 무결성 답변"],
        [
            "A source-grounded Korean answer about laboratory and manufacturing records.",
            "시험 및 제조 기록에 관한 원문 기반 한국어 답변입니다.",
        ],
    ),
    "research-contamination": (
        "workspace",
        ["Contamination controls across companies", "회사별 오염관리 관찰사항 비교"],
        [
            "A research brief with findings, evidence checks and unanswered applicability questions.",
            "발견사항, 근거 점검, 추가 확인 질문을 담은 리서치 보고서입니다.",
        ],
    ),
    "research-laboratory-ko": (
        "workspace",
        ["Laboratory investigations, in Korean", "한국어 시험실 조사 비교"],
        [
            "A multi-source comparison of investigations and out-of-specification results.",
            "여러 원문에서 조사 및 규격 일탈 결과 처리를 비교합니다.",
        ],
    ),
    "document-summary": (
        "sources",
        ["Inside a warning-letter analysis", "경고서한 분석 결과"],
        [
            "An executive summary and source-linked attention points for one retained FDA letter.",
            "보존된 FDA 경고서한의 요약과 원문에 연결된 검토 항목입니다.",
        ],
    ),
    "document-findings": (
        "sources",
        ["Structured warning-letter findings", "구조화된 경고서한 지적 사항"],
        [
            "The document-analysis pipeline's findings, requested actions and source references.",
            "문서 분석 파이프라인의 지적 사항, 요구 조치, 원문 참조입니다.",
        ],
    ),
    "document-translation": (
        "sources",
        ["A complete Korean source translation", "원문 전체 한국어 번역"],
        [
            "A section-by-section translation retaining source anchors, citations and numbers.",
            "원문 위치, 인용, 숫자를 보존한 구간별 번역입니다.",
        ],
    ),
    "source-search": (
        "sources",
        ["Finding data-integrity evidence", "데이터 무결성 근거 검색"],
        [
            "Actual search results with passage excerpts and retained source versions.",
            "원문 발췌와 보존된 버전이 포함된 실제 검색 결과입니다.",
        ],
    ),
    "corpus-trends": (
        "sources",
        ["A 90-day collection snapshot", "90일 자료 동향"],
        [
            "The trends service summarizes the saved collection at the time of this run.",
            "실행 시점에 저장된 자료를 동향 서비스로 집계했습니다.",
        ],
    ),
    "case-plan": (
        "specialists",
        ["A versioned review plan", "버전이 지정된 검토 계획"],
        [
            "A real case-service response showing the objective, bounded task and review checkpoint.",
            "목표, 제한된 작업, 검토 지점을 담은 실제 케이스 서비스 결과입니다.",
        ],
    ),
    "regulatory-evidence": (
        "specialists",
        ["Extracted regulatory findings", "규제 지적 사항 추출"],
        [
            "A live model extracts from fictional sources; the specialist harness checks every anchor.",
            "실제 모델이 가상 원문에서 추출하고 전문 실행기가 인용 위치를 검사합니다.",
        ],
    ),
    "internal-knowledge": (
        "specialists",
        ["Matching internal documents", "관련 내부 문서 검색"],
        [
            "The retrieval service finds relevant revisions in the fictional quality-system corpus.",
            "검색 서비스가 가상 품질시스템 자료에서 관련 문서 버전을 찾습니다.",
        ],
    ),
    "impact-analysis": (
        "specialists",
        ["From evidence to impact hypotheses", "근거에서 영향 가설로"],
        [
            "Potential relationships connect external findings to internal evidence and explicit gaps.",
            "외부 지적 사항과 내부 근거를 연결하고 확인되지 않은 점을 명시합니다.",
        ],
    ),
    "verification": (
        "governance",
        ["A verification report", "검증 보고서"],
        [
            "The verifier checks source integrity, claims and unresolved contradictions.",
            "검증기가 원문 무결성, 주장, 해결되지 않은 모순을 검사합니다.",
        ],
    ),
    "review-package": (
        "governance",
        ["The assembled review package", "완성된 검토 자료 초안"],
        [
            "A composed draft with linked hypotheses, evidence and a verification record.",
            "가설, 근거, 검증 기록을 연결해 구성한 검토 초안입니다.",
        ],
    ),
    "review-history": (
        "governance",
        ["A review history with checkpoints", "검토 지점이 포함된 이력"],
        [
            "Inspect the actual case event log from the isolated demonstration, including simulated decisions.",
            "시뮬레이션 결정을 포함한 격리 시연의 실제 케이스 이벤트 기록입니다.",
        ],
    ),
    "evaluation": (
        "governance",
        ["How an evaluation report looks", "평가 보고서 형식"],
        [
            "Three fixture-grading trials from the evaluation service, labeled as a reference replay.",
            "평가 서비스의 참조 재실행으로 표시된 3회 픽스처 채점 결과입니다.",
        ],
    ),
    "operations": (
        "governance",
        ["Specialist version inventory", "전문 에이전트 버전 목록"],
        [
            "The operations service reports exact versions and their reference release states.",
            "운영 서비스가 정확한 버전과 참조 릴리스 상태를 보고합니다.",
        ],
    ),
}


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def fields(value, names):
    return {name: value[name] for name in names if name in value}


def ref_safe(value):
    if isinstance(value, dict):
        return {
            k: ref_safe(v)
            for k, v in value.items()
            if k not in {"official_url", "source_url", "url"}
        }
    if isinstance(value, list):
        return [ref_safe(item) for item in value]
    return value


def section(title, *, text=None, items=None, source_ids=None):
    return {
        "title": title,
        **({"text": text} if text else {}),
        **({"items": items} if items else {}),
        **({"sourceIds": source_ids} if source_ids else {}),
    }


def source(value, index=0):
    return {
        k: v
        for k, v in {
            "id": value.get("id", f"S{index + 1}"),
            "label": value.get("company", value.get("label", "Synthetic source")),
            "excerpt": value.get("excerpt", ""),
            "url": value.get("sourceUrl", value.get("source_url")),
            "anchor": value.get("anchor"),
            "version": str(value.get("sourceVersion", value.get("version", ""))),
            "hash": value.get("sourceHash", value.get("source_hash")),
        }.items()
        if v
    }


def main():
    PUBLIC.mkdir(parents=True, exist_ok=True)
    examples = []
    for slug, (group, title, description) in META.items():
        reference = group in {"specialists", "governance"}
        path = (
            RAW / "reference" / f"{slug}.json"
            if reference
            else RAW / "v2" / f"{slug}.json"
        )
        if not reference and (RAW / "v3" / f"{slug}.json").exists():
            path = RAW / "v3" / f"{slug}.json"
        if not path.exists() and not reference:
            path = RAW / f"{slug}.json"
        if not path.exists():
            print(f"Pending: {slug}")
            continue
        record = read(path)
        raw = record["output"]
        sections, sources, steps, limits = [], [], [], []
        status, method, prompt = "Draft for review", record.get("method", ""), ""
        language = record.get("language", "en")
        record_id = raw.get("id")
        if slug.startswith("chat-"):
            data = raw["data"]
            if not data.get("generationUsed"):
                raise ValueError(f"{slug}: no real model generation")
            output = fields(
                data,
                [
                    "answer",
                    "citations",
                    "generatedAt",
                    "retrievalStrategy",
                    "evidenceSufficiency",
                    "effectiveModelId",
                    "generationUsed",
                    "interpretationLabel",
                ],
            )
            prompt = record["input"]["question"]
            sections = [
                section("답변" if language == "ko" else "Answer", text=data["answer"])
            ]
            sources = [
                source({**value, "id": str(i + 1)}, i)
                for i, value in enumerate(data["citations"])
            ]
            steps = [
                {
                    "label": "Retrieve saved FDA passages",
                    "detail": data["retrievalStrategy"],
                },
                {
                    "label": "Generate and validate the answer",
                    "detail": data.get("effectiveModelId", ""),
                },
                {"label": "Retain cited draft"},
            ]
            method = "Hosted Chat API / " + data.get("effectiveModelId", "")
            record_id = data.get("requestId")
            limits = [
                "Generated from the cited excerpts, not an exhaustive assessment of the collection.",
                "No internal company records or human approval were supplied.",
            ]
        elif slug.startswith("research-"):
            if raw["status"] != "completed":
                print(f"Pending: {slug} ({raw['status']})")
                continue
            output = fields(
                raw,
                [
                    "objective",
                    "language",
                    "status",
                    "plan",
                    "result",
                    "sources",
                    "events",
                    "model_calls",
                    "started_at",
                    "finished_at",
                ],
            )
            prompt = raw["objective"]
            brief = raw["result"]
            sections = [
                section(
                    brief["title"],
                    items=[
                        f"{f['statement']} [{', '.join(f['citation_ids'])}]"
                        + (
                            "\n" + "\n".join(f.get("limitations", []))
                            if f.get("limitations")
                            else ""
                        )
                        for f in brief["findings"]
                    ],
                ),
                section(
                    "검토 질문" if language == "ko" else "Review questions",
                    items=brief["review_questions"],
                ),
            ]
            sources = [source(value, i) for i, value in enumerate(brief["sources"])]
            steps = [
                {
                    "label": event["kind"].replace("_", " ").capitalize(),
                    "detail": event.get("data", {}).get(
                        "query", event.get("data", {}).get("code", "")
                    ),
                }
                for event in raw["events"]
                if event["kind"]
                not in {
                    "choosing_action",
                    "check_started",
                    "read_started",
                    "search_started",
                }
            ]
            method = f"Hosted Research worker / {raw['model_calls']} model calls"
            limits = brief["limitations"] + [
                "The evidence check is automated, not a human approval."
            ]
        elif slug.startswith("document-"):
            if record.get("http_status") != 200:
                print(f"Pending: {slug} (generation failed)")
                continue
            output = fields(
                raw,
                [
                    "artifactType",
                    "language",
                    "content",
                    "provider",
                    "modelId",
                    "promptVersion",
                    "sourceHash",
                    "createdAt",
                ],
            )
            prompt = f"{record['input']['company']} — " + (
                "Translate the retained FDA warning letter into Korean, preserving source sections and protected tokens."
                if slug.endswith("translation")
                else "Analyze the retained FDA warning letter in English."
            )
            content = raw["content"]
            if slug.endswith("summary"):
                sections = [
                    section("Executive summary", text=content["executiveSummary"]),
                    *[
                        section(item["title"], text=item["rationale"])
                        for item in content.get("attentionPoints", [])
                    ],
                    section(
                        "Review questions", items=content.get("comparisonQuestions", [])
                    ),
                ]
            elif slug.endswith("findings"):
                sections = [
                    section(
                        item["title"],
                        text=item["finding"],
                        items=item.get("requestedActions", []),
                    )
                    for item in content["findings"]
                ]
            else:
                sections = [
                    section(item["heading"], items=item["paragraphs"])
                    for item in content["sections"]
                ]
            original_sections = read(RAW / "document-source-sections.json")
            needed = {
                anchor
                for point in content.get("attentionPoints", [])
                for anchor in point["sourceAnchors"]
            }
            if slug.endswith("findings"):
                needed = {
                    anchor
                    for finding in content["findings"]
                    for anchor in finding["evidenceAnchors"]
                }
            for original in original_sections:
                if (
                    not slug.endswith("translation")
                    and original["anchor"] not in needed
                ):
                    continue
                sources.append(
                    {
                        "id": f"D{len(sources) + 1}",
                        "label": record["input"]["company"]
                        + " · "
                        + original["heading"],
                        "url": record["input"]["source_url"],
                        "excerpt": "\n".join([original["heading"], *original["paragraphs"]]),
                        "anchor": original["anchor"],
                        "version": raw.get("documentVersionId", ""),
                        "hash": raw["sourceHash"],
                    }
                )
            if not slug.endswith("translation") and needed != {
                s["anchor"] for s in sources
            }:
                raise ValueError(
                    "Document analysis references an unavailable source section"
                )
            anchor_ids = {s["anchor"]: s["id"] for s in sources}
            if slug.endswith("summary"):
                sections[0]["sourceIds"] = list(anchor_ids.values())
                for rendered, point in zip(sections[1:], content["attentionPoints"]):
                    rendered["sourceIds"] = [
                        anchor_ids[anchor] for anchor in point["sourceAnchors"]
                    ]
            elif slug.endswith("findings"):
                for rendered, finding in zip(
                    sections, content["findings"], strict=True
                ):
                    rendered["sourceIds"] = [
                        anchor_ids[anchor] for anchor in finding["evidenceAnchors"]
                    ]
            else:
                for rendered, original in zip(sections, original_sections, strict=True):
                    rendered["sourceIds"] = [anchor_ids[original["anchor"]]]
            method = f"Hosted document {raw['artifactType']} / {raw['modelId']} / {raw['promptVersion']}"
            steps = [
                {"label": "Load retained source version"},
                {"label": "Generate document artifact"},
                {"label": "Validate structure and source bindings"},
            ]
            limits = [
                content.get(
                    "disclaimer",
                    "AI-generated reading aid; review against the official source before use.",
                )
            ]
        elif slug == "source-search":
            output = fields(raw, ["items"])
            prompt = "Search saved FDA sources for: data integrity"
            sources = [source(item, i) for i, item in enumerate(raw["items"])]
            sections = [
                section(
                    "Matching source passages",
                    items=[
                        f"{s['label']} · {s.get('anchor', '')}\n{s['excerpt']}"
                        for s in sources
                    ],
                )
            ]
            status, method = "Search completed", "Hosted public FDA source search"
            steps = [
                {"label": "Filter current public source versions"},
                {"label": "Rank topic matches"},
                {"label": f"Return {len(sources)} passages"},
            ]
            limits = [
                "A search snapshot of saved passages; it does not establish overall prevalence."
            ]
        elif slug == "corpus-trends":
            if raw.get("status") != "ready" or raw["data"].get("mode") != "live":
                raise ValueError("Trends must come from the live collection")
            data = raw["data"]
            output = fields(
                data,
                [
                    "currentCount",
                    "periodStart",
                    "periodEnd",
                    "categoryTrends",
                    "regulations",
                ],
            )
            prompt = f"Aggregate the saved collection for {data['periodStart']} through {data['periodEnd']}."
            sections = [
                section(
                    "Collection result",
                    text=f"{data['currentCount']} letters in the selected period.",
                ),
                section(
                    "Category breakdown",
                    items=[
                        f"{item['label']}: {item['value']} classified observations (previous period: {item['previous']})"
                        for item in data["categoryTrends"]
                    ],
                ),
                section(
                    "Regulation breakdown",
                    items=[
                        json.dumps(item, ensure_ascii=False)
                        for item in data["regulations"]
                    ]
                    or ["No regulation breakdown was returned for this period."],
                ),
            ]
            status, method = (
                "Aggregation completed",
                "Hosted trends aggregation service",
            )
            steps = [
                {"label": "Select 90-day reporting window"},
                {"label": "Aggregate retained source classifications"},
            ]
            limits = [
                "Counts describe this saved collection and period, not all FDA activity."
            ]
        else:
            output = ref_safe(raw)
            prompt = record["input"].get(
                "objective",
                record["input"].get(
                    "query",
                    json.dumps(ref_safe(record["input"]), ensure_ascii=False, indent=2)
                    if record["input"]
                    else "No input parameters supplied.",
                ),
            )
            status = "Reference run completed"
            limits = [
                "Fictional FDA fixtures and internal quality documents; no actual company assessment.",
                "Reviewer decisions are scripted simulation inputs in an isolated database.",
                "This does not enable or qualify production specialist execution.",
            ]
            if slug == "case-plan":
                sections = [
                    section(
                        "Plan",
                        items=[
                            f"{step['title']}\n{step['instructions']}"
                            for step in raw["steps"]
                        ],
                    ),
                    section(
                        "Version and state",
                        text=f"Version {raw['version']} · plan fingerprint {raw['plan_sha256']}",
                    ),
                ]
                steps = [
                    {"label": "Create isolated case"},
                    {"label": "Bind source version"},
                    {"label": "Persist versioned review plan"},
                ]
            elif slug == "regulatory-evidence":
                if raw["status"] != "success":
                    raise ValueError("Specialist output failed")
                findings = raw["output"]["findings"]
                sections = [
                    section(
                        f["title"],
                        text=f["finding_text"],
                        items=[
                            *f["quality_system_categories"],
                            *[a["action"] for a in f["fda_requested_actions"]],
                        ],
                    )
                    for f in findings
                ]
                seen = set()
                for finding in findings:
                    for value in finding["evidence"]:
                        if value["anchor_id"] in seen:
                            continue
                        seen.add(value["anchor_id"])
                        sources.append(
                            {
                                "id": value["anchor_id"],
                                "label": "Fictional FDA source fixture",
                                "excerpt": value["excerpt"],
                                "anchor": value["anchor_id"],
                                "version": value["source_version_id"],
                                "hash": value["source_hash"],
                            }
                        )
                steps = [
                    {
                        "label": "Generate structured findings",
                        "detail": f"{raw['model_attempts']} model attempt(s)",
                    },
                    {
                        "label": "Resolve exact source anchors",
                        "detail": f"{raw['tool_calls']} tool call(s)",
                    },
                    {
                        "label": "Validate findings",
                        "detail": f"{raw['correction_loops']} correction loop(s)",
                    },
                ]
            elif slug == "internal-knowledge":
                sections = [
                    section(
                        f"{item['asset_key']} · {item['title']}",
                        text=f"Revision {item['revision']} · {item['effective_status']} · {item['domain']}",
                        items=[a["excerpt"] for a in item["internal_evidence_anchors"]],
                    )
                    for item in raw["items"]
                ]
                sources = [
                    {
                        "id": f"I{i + 1}",
                        "label": item["asset_key"] + " (fictional)",
                        "excerpt": item["internal_evidence_anchors"][0]["excerpt"],
                        "version": str(item["revision"]),
                    }
                    for i, item in enumerate(raw["items"])
                ]
                steps = [
                    {"label": "Apply document access filters"},
                    {"label": "Rank lexical, semantic and relationship matches"},
                    {"label": "Return current document revisions"},
                ]
            elif slug == "impact-analysis":
                for i, item in enumerate(raw["items"]):
                    refs = []
                    for e in [*item["external_evidence"], *item["internal_evidence"]]:
                        retained = next(
                            (
                                s
                                for s in sources
                                if s["anchor"] == e["anchor_id"]
                                and s["version"] == e["source_version_id"]
                            ),
                            None,
                        )
                        if retained is None:
                            retained = {
                                "id": f"E{len(sources) + 1}",
                                "label": e["source_type"] + " (fictional)",
                                "excerpt": e["excerpt"],
                                "anchor": e["anchor_id"],
                                "version": e["source_version_id"],
                                "hash": e["source_hash"],
                            }
                            sources.append(retained)
                        refs.append(retained["id"])
                    sections.append(
                        section(
                            f"Hypothesis {i + 1} · {item.get('asset_key', item['relationship_type'])}",
                            text=item["statement"],
                            items=[
                                *item["counterevidence"],
                                *item["unknowns"],
                                *item["recommended_verification"],
                            ],
                            source_ids=refs,
                        )
                    )
                steps = [
                    {"label": "Read simulated approved findings"},
                    {"label": "Retrieve fictional internal context"},
                    {"label": "Compose hypotheses with two evidence paths"},
                ]
            elif slug == "verification":
                sections = [
                    section("Verification status", text=raw["status"]),
                    section(
                        "Checks",
                        items=[
                            f"{item['status']} · {item['detail']}"
                            for item in raw["checks"]
                        ],
                    ),
                    section(
                        "Issues",
                        items=[str(item) for item in raw["issues"]]
                        or [
                            "No issues reported by this verifier for the selected hypothesis."
                        ],
                    ),
                ]
                steps = [
                    {"label": "Load simulated accepted hypothesis"},
                    {"label": "Check hashes and exact evidence"},
                    {"label": "Check claims and contradictions"},
                ]
                limits.append(
                    "The deterministic verifier's PASS is not a human review decision."
                )
            elif slug == "review-package":
                content = raw["content"]
                sections = [
                    section(content["title"], text=content["notice"]),
                    section(
                        "Hypotheses",
                        items=[
                            item["statement"] for item in content["impact_hypotheses"]
                        ],
                    ),
                    section("Verification", text=content["verification"]["status"]),
                    section("Artifact status", text=raw["status"]),
                ]
                for hypothesis in content["impact_hypotheses"]:
                    for e in [
                        *hypothesis["external_evidence"],
                        *hypothesis["internal_evidence"],
                    ]:
                        sources.append(
                            {
                                "id": f"E{len(sources) + 1}",
                                "label": e["source_type"] + " (fictional)",
                                "excerpt": e["excerpt"],
                                "anchor": e["anchor_id"],
                                "version": e["source_version_id"],
                                "hash": e["source_hash"],
                            }
                        )
                sections[1]["sourceIds"] = [s["id"] for s in sources]
                status = "Draft · human review pending"
                steps = [
                    {"label": "Bind verification report"},
                    {"label": "Compose versioned package"},
                    {"label": "Stop at draft review checkpoint"},
                ]
            elif slug == "review-history":
                events = raw["items"]
                sections = [
                    section(
                        "Simulated case timeline",
                        items=[
                            f"{item['event_type']} · {item['occurred_at']}"
                            for item in events
                        ],
                    )
                ]
                steps = [
                    {"label": "Read durable case events"},
                    {"label": "Retain simulated decision history"},
                ]
            elif slug == "evaluation":
                sections = [
                    section(
                        "Fixture grading result",
                        text=f"{raw['status']} · {raw['passed_trials']}/{raw['total_trials']} fixture trials passed.",
                    ),
                    section(
                        "Trial observations",
                        items=[
                            f"Trial {trial['trial_number']}: {trial['status']}\n"
                            + "\n".join(
                                f"{grade['metric']}: {grade['rationale']}"
                                for grade in trial["grades"]
                            )
                            for trial in raw["trials"]
                        ],
                    ),
                ]
                steps = [
                    {"label": "Bind exact workflow version"},
                    {"label": "Replay observed outcome as fixture input three times"},
                    {"label": "Grade fixture outcomes"},
                ]
                limits.append(
                    "The runner grades supplied fixtures. It does not execute an independent model evaluation or approve a release."
                )
            elif slug == "operations":
                items = raw["items"]
                sections = [
                    section(
                        "Registered versions",
                        items=[
                            f"{item.get('name', item.get('key', item.get('display_name', 'Version')))} · {item.get('version', '')} · {item.get('release_status', '')}"
                            for item in items
                        ],
                    )
                ]
                steps = [
                    {"label": "Load bundled registry contracts"},
                    {"label": "Report registered version states"},
                ]
        snapshot = {
            "example": slug,
            "origin": record["origin"],
            "captured_at": record["captured_at"],
            "synthetic_sources": reference,
            "simulated_reviews": reference,
            "human_approved": False,
            "method": method,
            "input": prompt,
            "output": output,
        }
        content = json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n"
        destination = PUBLIC / f"{slug}.json"
        destination.write_text(content, encoding="utf-8", newline="\n")
        examples.append(
            {
                "slug": slug,
                "title": title,
                "description": description,
                "group": group,
                "origin": "reference" if reference else "live",
                "language": language,
                "executedAt": record["captured_at"],
                "status": status,
                "method": method,
                **({"recordId": record_id} if record_id else {}),
                "input": prompt,
                "sections": sections,
                "sources": sources,
                "steps": steps,
                "limitations": limits,
                "download": f"/examples/{slug}.json",
                "sha256": hashlib.sha256(content.encode()).hexdigest(),
            }
        )
    CATALOG.write_text(
        json.dumps(examples, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Published {len(examples)} curated example snapshots.")


if __name__ == "__main__":
    main()
