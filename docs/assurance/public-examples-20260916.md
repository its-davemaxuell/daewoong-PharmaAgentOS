# Public pipeline examples — September 16, 2026

## Requested outcome

The user requested examples produced by every service pipeline, inspection of the
results, repair of poor results, and deployment. They explicitly selected a
**public Examples area** rather than private browser history.

The new `/examples` gallery and `/examples/[slug]` pages follow the deployed
porcelain neumorphic design. English/Korean navigation, category filters, search,
source disclosures, copy feedback, downloads and reduced motion are included.
The catalog is a curated build artifact: the public routes cannot query private
history, sessions or application tables. Viewing examples does not start a job.

## Coverage and actual execution

| Area | Retained results | Execution |
| --- | --- | --- |
| Chat | English quality-unit review; Korean data-integrity review | Fresh hosted retrieval and real model generation |
| Research | English contamination comparison; Korean OOS comparison | Fresh hosted worker runs, bounded tools and model evidence verification |
| Documents | Summary, structured findings, complete Korean translation | Hosted document pipeline on the retained Dabur FDA warning letter; summary/findings share one analysis |
| Source tools | Data-integrity search; 90-day trends | Hosted public search and live collection aggregation |
| Specialists | Case plan, regulatory extraction, internal retrieval, impact hypotheses | Actual application services in a new isolated SQLite demonstration database; real model extraction and source-anchor validation |
| Review/operations | Verification, draft package, event history, evaluation report, version inventory | Actual reference services; explicitly simulated reviewers and fixture grading |

There are **18 examples: nine hosted public-FDA results and nine isolated
reference results**. Reference FDA fixtures and internal quality documents are
fictional. Reviewer identities/decisions are simulated inputs. The final package
remains a draft. Three evaluation trials grade supplied fixtures; they do not
execute independent model evaluations or approve a production release. Personal
specialist execution remains disabled. These distinctions appear in the gallery,
detail pages, copied results and downloadable artifacts.

Every download has a SHA-256 fingerprint. Results retain execution method,
timestamps, original inputs, output and available source hashes/versions. Document
evidence includes exact retained headings and paragraphs, including heading-only
sections. Source links on findings and hypotheses open their referenced evidence.
Raw captures, cookies, provider credentials and diagnostic checkpoints remain in
ignored `.artifacts` and are excluded from publication.

## Defects found by actual execution

1. **Research planning loop:** a real plan exceeded hidden 180-character step
   limits. The model's schema now exposes those bounds and correction feedback
   identifies invalid fields without echoing private inputs. The English rerun
   completed in seven model calls.
2. **Chat evidence relevance:** generic inspection introductions outranked the
   requested topic, and excerpts could end before supporting text. Ranking now
   weights terms by frequency in the authorized corpus and selects exact contiguous
   evidence windows around relevant text. Fresh English/Korean answers provide
   company-attributed evidence and conditional review questions.
3. **Overstrict Research reviewer:** the Korean verifier repeatedly acknowledged
   supported claims but requested equivalent wording or citations already supplied.
   Instructions now distinguish material support errors from stylistic preferences,
   and the verification call uses low reasoning effort. The corrected Korean run
   completed in six calls with three cited companies. Budgets and validators remain.
4. **Translation validation:** an English postal address was falsely rejected;
   English number words converted to digits also violated token preservation.
   Address recognition now covers the observed corporate-office form while retaining
   its structural restrictions. Generation/correction prompts require Korean number
   words for spelled-out numbers. Existing digit, citation, URL, redaction, anchor
   and paragraph validation remains strict.
5. **Translation duration:** independent top-level batches now run with concurrency
   bounded to three. Each has isolated mutable model state; results retain source
   order. Any failure cancels and awaits siblings before persistence. A full hosted
   ten-section v5 translation completed in 119.25 seconds after earlier HTTP 502s.
6. **Translation terminology:** personal reading of that result found CFR “part”
   translated as a physical component and inconsistent quality-unit terminology.
   Prompt v6 supplies consistent pharmaceutical Korean terminology and preserves
   regulatory citation wording. The complete hosted v6 rerun passed in 152.61
   seconds; all ten sections remain and the observed terminology errors are gone.
7. **Impact readability:** hypotheses now include the actual finding, internal
   asset revision/domain, and remaining uncertainty instead of opaque finding IDs
   in otherwise generic prose. The real reference services were rerun successfully.

The first Chat capture also sent a message identifier without a thread identifier.
That was a capture-script error, not a core Chat failure. The script was corrected;
the website proxy now returns a clear 422 for that malformed combination.

Pipeline revisions: `851b44e`, `8d6f457`, `63193ab`, `df03a8e`.

## Validation

- Affected Chat/RAG/Research checks: 95 combined tests; the subsequent Research
  feedback regression set passed 12 tests.
- Translation/internal-knowledge/verification set passed 61 tests. Two stale prompt
  version expectations found in a later run were corrected and passed on rerun.
- Final full AI suite after bounded concurrency and glossary changes: 57 passed.
  Includes order/concurrency, sibling cancellation, protected tokens, substantive
  Korean, address recognition, fallback and paragraph completeness.
- Web unit tests: 99 passed across 29 files. Coverage includes all 18 examples,
  unique evidence identifiers, resolved references, exact download fingerprints,
  truthful synthetic labels and exclusion of session/checkpoint secrets.
- Next.js production build/TypeScript and ESLint passed. Changed Python files and
  capture/publisher scripts pass Ruff.
- Impeccable independent finish review found no material visual defects. Its content
  findings were fixed: actual timestamps and inputs, exact document excerpts,
  evidence for all impact hypotheses, and evidence on the composed review package.
- Initial browser checks passed 6/6 in Chromium, Firefox and WebKit. The expanded
  final check adds findings-to-evidence navigation and unknown-slug not-found UI
  with `noindex`. Its initial hard-404 expectation was corrected after confirming
  Next.js's documented streamed-200 behavior in the installed framework docs.
  The assertion accepts the existing duplicate noindex tags. All nine local cases
  pass across the recorded runs; a local server interruption required rerunning the
  two affected Firefox/WebKit cases, which passed. Hosted outcomes are below.
- All four Chromium startup scenarios pass. A new unit regression ensures Examples
  imports its bundled component without requesting a nonexistent menu API.
- CI initially found two document-artifact tests with stale v4 fake/expected
  versions. These fixtures were updated to v6; all 32 document-artifact tests pass,
  including persistence, cache reuse, outdated-prompt invalidation and fallback.

This is operational example verification with a small deliberate task set, not a
statistical quality benchmark, independent human approval or production qualification
of the reference specialist workflow. Generated translations remain reading aids
with original evidence available for comparison.

## Reproduction

Run from `C:\Users\user\Desktop\PharmaAgentOS`:

```powershell
services/api/.venv/Scripts/python.exe scripts/generate_live_examples.py --output .artifacts/pipeline-examples/new-run
# OPENAI_API_KEY must already be configured; never write it into a capture.
services/api/.venv/Scripts/python.exe scripts/generate_reference_examples.py
services/api/.venv/Scripts/python.exe scripts/generate_document_examples.py --artifact translation
services/api/.venv/Scripts/python.exe scripts/publish_example_snapshots.py
node scripts/verify_public_examples.cjs https://pharmaagent-os-ochre.vercel.app
```

The publisher intentionally selects named reviewed captures from `v3`, then `v2`,
then the original capture folder; new-run output requires deliberate selection.
The document collector uses the selected Chat source and its demonstration cookie
jar. Source search, trends and original document sections were separately captured
through the hosted service/read-only retained-source inspection during this run.
The reference script always creates a new isolated database. Never redirect its
simulated reviewer calls to production.

## Deployment

Hosted translation v6 is retained with source hash
`1a5123c024949f8204b85f405b738eb13865e962a369ff91599c36456009b20e`.
Final public-site revision and live browser evidence await the last deployment
check. The existing neumorphic site remains live throughout.
