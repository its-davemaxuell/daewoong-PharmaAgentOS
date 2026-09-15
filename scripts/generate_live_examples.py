"""Run fresh public demonstration tasks through the hosted Chat/Research APIs.

Raw captures stay in ignored .artifacts; they are never served to visitors. Reusing
this directory resumes polling saved research IDs without submitting duplicate jobs.
This script does not read or publish other browser sessions' histories.
"""

from __future__ import annotations

import argparse
import json
import time
import uuid
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
TASKS = [
    (
        "chat-quality-unit",
        "chat",
        "en",
        "Using the saved FDA Drug warning letters, give three specific examples of quality-unit oversight deficiencies. Attribute each observation to its company and cite the source. End with two conditional questions a quality team could use to review its own records, and state the limits of this comparison.",
    ),
    (
        "chat-data-integrity-ko",
        "chat",
        "ko",
        "저장된 FDA 의약품 경고서한에서 데이터 무결성 또는 시험기록 관리와 관련된 관찰사항을 3가지 정리해 주세요. 회사별로 구분하고 근거를 인용하세요. 마지막에 우리 조직이 해당 업무를 수행하는 경우 검토할 질문 2가지와 근거의 한계를 제시하세요. 우리 회사의 결함을 추정하지 마세요.",
    ),
    (
        "research-contamination",
        "research",
        "en",
        "Compare contamination-control observations in at least two companies' saved FDA Drug warning letters. Identify three to five source-supported findings, explain what differs between the cases, and provide conditional review questions for a team that manufactures sterile products. Clearly separate observed source facts from unanswered applicability questions. This is a public demonstration draft, not a compliance decision.",
    ),
    (
        "research-laboratory-ko",
        "research",
        "ko",
        "공개 예시용 검토 초안: 저장된 FDA 의약품 경고서한 중 시험실 조사 또는 부적합 시험결과(OOS) 처리에 관한 최소 두 회사의 관찰사항을 비교하세요. 근거가 있는 발견사항 3~5개와 회사별 차이, 해당 시험을 수행하는 조직에서 검토할 수 있는 조건부 질문을 한국어로 작성하세요. 실제 내부 자료는 제공되지 않았으므로 우리 회사의 준수 상태를 추정하지 마세요.",
    ),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="https://pharmaagent-os-ochre.vercel.app")
    parser.add_argument("--output", default=".artifacts/pipeline-examples")
    parser.add_argument("--only", choices=["chat", "research"])
    parser.add_argument("--slug", choices=[task[0] for task in TASKS])
    args = parser.parse_args()
    out = (ROOT / args.output).resolve()
    out.relative_to(ROOT)
    out.mkdir(parents=True, exist_ok=True)
    cookie_path = out / "session-cookies.json"
    with httpx.Client(base_url=args.base, timeout=180, follow_redirects=True) as client:
        if cookie_path.exists():
            client.cookies.update(json.loads(cookie_path.read_text()))
        client.get("/api/research").raise_for_status()
        cookie_path.write_text(json.dumps(dict(client.cookies)), encoding="utf-8")
        for slug, kind, language, prompt in TASKS:
            if args.only and kind != args.only:
                continue
            if args.slug and slug != args.slug:
                continue
            path = out / f"{slug}.json"
            if path.exists():
                record = json.loads(path.read_text(encoding="utf-8"))
                if kind == "chat" or record["output"]["status"] not in {
                    "queued",
                    "running",
                }:
                    print(f"{slug}: retained existing capture", flush=True)
                    continue
            else:
                started = time.time()
                if kind == "chat":
                    payload = {
                        "question": prompt,
                        "language": language,
                        "filters": {},
                        "maxSources": 6,
                        "options": {
                            "modelProfile": "balanced",
                            "retrievalMode": "corpus",
                        },
                    }
                    response = client.post(
                        "/api/chat/query", json=payload, headers={"Origin": args.base}
                    )
                else:
                    payload = {
                        "objective": prompt,
                        "language": language,
                        "client_request_id": str(uuid.uuid4()),
                    }
                    response = client.post(
                        "/api/research", json=payload, headers={"Origin": args.base}
                    )
                response.raise_for_status()
                record = {
                    "slug": slug,
                    "kind": kind,
                    "language": language,
                    "origin": args.base,
                    "input": payload,
                    "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "elapsed_seconds": round(time.time() - started, 2),
                    "output": response.json(),
                }
                path.write_text(
                    json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8"
                )
                print(f"{slug}: captured {response.status_code}", flush=True)
            if kind == "research":
                run_id = record["output"]["id"]
                previous = None
                for _ in range(160):
                    response = client.get("/api/research/" + run_id)
                    response.raise_for_status()
                    data = response.json()
                    run = data.get("run", data)
                    record["output"] = run
                    path.write_text(
                        json.dumps(record, ensure_ascii=False, indent=2),
                        encoding="utf-8",
                    )
                    state = (run["status"], run["stage"], run["model_calls"])
                    if state != previous:
                        print(f"{slug}: {state}", flush=True)
                        previous = state
                    if run["status"] not in {"queued", "running"}:
                        break
                    time.sleep(5)
                else:
                    raise TimeoutError(
                        f"{slug}: observation window exceeded; saved run can be resumed"
                    )
        cookie_path.write_text(json.dumps(dict(client.cookies)), encoding="utf-8")


if __name__ == "__main__":
    main()
