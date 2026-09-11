# PharmaAgent OS

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Daewoong employees preparing questions about FDA findings, including staff who
do not know agent terminology or regulatory software. Quality and regulatory
specialists retain the formal review role. The user explicitly requested an
interface that anyone in the company can understand and use.

## Product Purpose

Turn a regulatory question and retained source evidence into an inspectable
agent plan, evidence trail, and review package for a human decision.

## Operating Context

FDA source discovery, case preparation, specialist steps, evidence verification,
human approvals, and execution oversight. Korean and English are supported.

## Capabilities and Constraints

The user explicitly removed all account login. Public visitors remain viewers.
Existing API authorization, source-version ownership, and review gates remain.
The hosted database, FDA source library and cited AI answers are connected.
The FDA Research Agent accepts an employee goal, chooses bounded search/read tools,
checks cited findings and saves a review brief. Its plan, tool events and evidence
are visible during execution. Tasks persist on the service with browser-session
ownership, stop/resume controls and bounded background execution.
Automatic FDA ingestion, specialist execution and independent evaluation
qualification are incomplete. The interface must never invent runs,
FDA records, completion statistics, or successful agent execution. A locally
prepared objective is a draft, not an executed or server-saved case.

## Brand Commitments

PharmaAgent OS is the product name. Retain the existing Daewoong identity asset
as organizational attribution. This preservation is inferred from the repository.

The user approved composition A on 10 September 2026: a bright, compact,
modern workspace with white compartments, subtle three-dimensional depth,
indigo controls, and useful content in the first viewport. This replaces the
previous navy navigation. Visual craft is a primary product requirement.

## Evidence on Hand

PHARMA_AGENT_OS_IMPLEMENTATION_PLAN.md is the source plan;
PHARMA_AGENT_OS_IMPLEMENTATION_HANDOFF.md is the current implementation record.
Existing case, evidence, governance, chat, and evaluation routes provide the
functional baseline. Agent definitions exist under contracts/agents.

## Product Principles

- Lead with an employee task and an editable question, with examples.
- Keep specialist configuration and operational tools secondary.
- Explain which actions work now, where work is saved, and what happens next.
- Make agent responsibility, source evidence, and human decisions inspectable.
- Distinguish planned, running, completed, unavailable, and restricted states.
- Lead beginners to FDA agent research; keep quick chat accessible and local draft preparation secondary.
## September 11 UI direction update

The user's Evidence continuity specification replaces the prior Layered desk
visual preference. Serve pharmaceutical QA, regulatory affairs and compliance
users with compact neutral/blue working surfaces, persistent context and direct
source inspection. The operational dashboard replaces permanent onboarding.
The authoritative visual system is DESIGN.md; API authorization and document
provenance remain product constraints.

## September 11 Clearer Workspaces refinement

The approved refinement serves a mixed employee audience and retains the current
neutral/blue identity. Everyday navigation prioritizes Research, Inbox and Saved
work; evidence browsing and governed team review form separate groups. Overview
leads with starting and continuing real work. Shared page patterns, mobile question
priority and visible distinctions between source evidence, AI findings and human
review are the acceptance criteria. DESIGN.md records the updated visual system.

## September 12 product priority

The user identifies RAG Chatbot and Research Agent as the primary service. Both
lead the left sidebar; Chat is the landing page. Supporting menus remain direct
links. The chatbot should follow familiar commercial chat workflows, with
conversation organization, evidence inspection, export, in-chat search and an
explicit draft handoff to research. Smooth tab/selection feedback and animated
loading are required, with reduced-motion support.

The user declined identity-provider setup after asking for team capabilities.
Keep anonymous browser sessions, existing access controls and manual export-based
sharing. Personal usage reporting is in scope; named sharing, team membership and
team-wide reporting require a separately authorized identity setup.
