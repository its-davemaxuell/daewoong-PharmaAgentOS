# Neumorphic website deployment — September 16, 2026

## Publication

The user explicitly authorized deployment after the design and interaction work.
Application revision `8a2cd7462be36feb3314c5130e69117056df3fd5` is published at
[PharmaAgent OS](https://pharmaagent-os-ochre.vercel.app/ask).

[Vercel](https://vercel.com/davemaxuellkr-9654/pharmaagent-os/6i7wiCpaQQTtTx1FQiqzaMNoKqaG)
and both connected Railway services report successful deployments for that commit.
Web `/api/health` and Railway API `/health/ready` pass; the database and object
store report ready. Evidence is retained in `.artifacts/interactions/` as
`deployment-status.json` and `production-health.json`.

The release includes the complete porcelain/cobalt neumorphic surface system,
shared pointer and keyboard press feedback, native dialog/disclosure transitions,
inert exits, focus restoration, mobile close-target correction and live reduced
motion support. There are no API, dependency, schema, authorization or service
configuration changes. The user's unrelated root image was not staged.

## Verification

Local evidence remains in the [design record](neumorphism-20260915.md) and
[interaction record](interactions-20260915.md): 104 visual views, 46 final browser
checks including startup, 95 unit tests, production build/TypeScript and lint.

Hosted verification checks English desktop at 1440px and Korean mobile at 390px
in Chromium, Firefox and WebKit. It verifies the actual new body/shell classes
and porcelain color, keyboard press/release, the mobile close target, 17 direct
destinations, prepared drafts and their preservation, Chat/Research options,
source disclosure, no startup replay, reduced motion and horizontal overflow.
Hosted result: **6/6 passed**, with zero page script errors, HTTP failures or
horizontal overflow. The Chromium mobile check uses a real touch tap on Close.

Fresh sessions can reach the existing slow-menu notice. A single Retry recovered
each of the six hosted checks. This is recovery verification, not a claim that
cold startup always completes without intervention. No live Chat or Research
request was submitted. Screenshots and result JSON are retained as
`.artifacts/interactions/hosted-*`.

## Automated release checks

[Code security](https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34988724346)
passes. The [quality workflow](https://github.com/its-davemaxuell/daewoong-PharmaAgentOS/actions/runs/34988724340)
has passed backend, frontend, schema, Temporal recovery, contracts, secret scanning,
both containers and deployment rendering. Its full browser suite is in progress.

## Rollback

The previous application revision is `46fea5f884443f3e8bce21a445ab91bd5dbca2dd`
(the previous documentation-only branch head was `d8ed175`). If needed, restore
the previous application deployment; this frontend release requires no data or
schema rollback. No rollback was performed.
