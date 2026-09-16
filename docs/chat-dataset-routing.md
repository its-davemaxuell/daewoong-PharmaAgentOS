# Dataset-aware chat searches

The chat selects a search method before answering. The model may propose a typed
query; the API owns validation, authorization and execution.

## Search methods

| Request | Execution |
| --- | --- |
| Latest letters; letters issued this month | Saved catalog, ordered by issue date |
| Letters posted/appearing on the FDA website last month | Saved catalog, filtered by posting date |
| Counts, recipient countries, issuing offices | Exact aggregation over accessible saved records |
| An exact phrase mentioned in letters | Literal matching across accessible current source text |
| Findings or explanations | Authorized passage retrieval and cited synthesis |
| Summarize the latest two letters | Select two catalog records first; retrieve only their passages |
| Latest letters about data integrity | Search topical passages first; sort matching letters by date |
| Show more | Continue the persisted catalog query using the number of rows actually displayed |

Straightforward metadata requests skip the model and do not load passage bodies.
Natural wording that deterministic routing cannot resolve uses the configured
OpenAI or Gemini chat provider. The planner has a total 12-second deadline and at
most two proposals, including schema repair/provider fallback. It cannot generate
SQL, choose source IDs, call external URLs, modify data or supply the final facts.

Date, country, company and office controls remain application-enforced. Selected
letters and current-source permissions constrain both stages of mixed searches.
Empty catalog selections never widen into an unrestricted passage search. Summary
selection favors finding sections over opening/closing boilerplate and shares
source slots between selected letters.

## Date and result boundaries

- Relative periods use the API's current UTC date. “This month” ends today;
  “last month” covers the entire previous calendar month.
- “Latest” defaults to issue date. Posting dates are separate stored fields.
- Results describe the accessible saved FDA Drugs dataset, not a live FDA feed.
- Ingestion/arrival dates, closeout status and unsupported exclusions require
  clarification; they must not be substituted with posting dates or ignored.
- Exact semantic violation totals require a separately reviewed classification.
  Literal phrase counts measure mentions, not confirmed violations.
- Lists obey the request's source limit (currently six in the default UI, API
  maximum ten). The answer shows the displayed and total counts; “show more”
  continues the list. Exact counts are not limited to those displayed citations.
- Semantic topical retrieval is not an exhaustive corpus classification.

## Verification

`services/api/tests/test_chat_dataset.py` covers natural English/Korean requests,
month boundaries, issue/posting distinctions, body-free metadata reads, empty
selections, chronological two-stage retrieval, substantive summary selection,
filter conflicts, persisted pagination, bounded provider failures and structured
provider contracts. It runs with the existing metadata, RAG, focus, thread,
streaming and OpenAI suites.

`scripts/audit_chat_dataset.py` exercises 19 real hosted questions. The full saved
catalog is fetched independently to check citation dates, chronological ordering,
month membership and counts. Manual answer review is required: HTTP success and
valid citation IDs alone do not prove that an answer addresses the question.

Provider structured-output contracts follow the existing adapters and their
official [OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs)
and [Gemini documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
Application validation remains authoritative.
