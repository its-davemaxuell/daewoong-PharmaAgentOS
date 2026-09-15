"""Capture document-service results for a source from the new demonstration Chat.

Uses the same hosted endpoints as the website. Summary and findings share the
persisted analysis; the translation runs its protected-token pipeline separately.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / ".artifacts/pipeline-examples"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--artifact", choices=["summary", "findings", "translation"], required=True
    )
    args = parser.parse_args()
    source = json.loads(
        (RAW / "v2/chat-quality-unit.json").read_text(encoding="utf-8")
    )["output"]["data"]["citations"][0]
    base = "https://pharmaagent-os-ochre.vercel.app"
    out = RAW / "v3"
    out.mkdir(exist_ok=True)
    with httpx.Client(base_url=base, timeout=310, follow_redirects=True) as client:
        client.cookies.update(json.loads((RAW / "session-cookies.json").read_text()))
        start = time.monotonic()
        language = "ko" if args.artifact == "translation" else "en"
        response = client.post(
            f"/api/drug-letters/{source['letterId']}/ai-artifacts/{args.artifact}",
            headers={"Origin": base},
            json={"language": language},
        )
        record = {
            "slug": f"document-{args.artifact}",
            "kind": args.artifact,
            "language": language,
            "origin": base,
            "input": {
                "letter_id": source["letterId"],
                "company": source["company"],
                "source_url": source["sourceUrl"],
            },
            "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "elapsed_seconds": round(time.monotonic() - start, 2),
            "http_status": response.status_code,
            "output": response.json(),
        }
        (out / f"document-{args.artifact}.json").write_text(
            json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(
            args.artifact, response.status_code, record["elapsed_seconds"], flush=True
        )
        response.raise_for_status()


if __name__ == "__main__":
    main()
