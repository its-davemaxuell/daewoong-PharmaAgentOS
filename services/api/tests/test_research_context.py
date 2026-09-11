import asyncio
from uuid import uuid4

from test_research_agent import ScriptedModel, create, proposal, research  # noqa: F401

from app.models import DocumentChunk
from app.research.tools import search_sources
from app.research.worker import claim, execute_tool


def test_context_is_hydrated_and_replay_bound(research):  # noqa: F811
    client, headers, _ = research
    matches = client.get("/api/v1/research/runs/context?q=validation", headers=headers)
    assert matches.status_code == 200
    source = matches.json()["items"][0]
    run, body = create(research, selected_chunk_ids=[source["chunk_id"]])
    context = run["context"]
    assert context["selected_chunk_ids"] == [source["chunk_id"]]
    assert context["sources"][0]["source_hash"] == source["source_hash"]
    assert len(context["context_hash"]) == 64
    repeated = client.post("/api/v1/research/runs", json=body, headers=headers)
    assert repeated.json()["context"] == context
    body["selected_chunk_ids"] = []
    assert client.post("/api/v1/research/runs", json=body, headers=headers).status_code == 409
    other = {**headers, "X-Dev-User": "another-" + uuid4().hex}
    assert client.get(f"/api/v1/research/runs/{run['id']}", headers=other).status_code == 404


def test_context_rejects_missing_and_duplicate_evidence(research):  # noqa: F811
    client, headers, _ = research
    body = {
        "objective": "Research validation evidence",
        "language": "en",
        "client_request_id": str(uuid4()),
        "selected_chunk_ids": [str(uuid4())],
    }
    assert client.post("/api/v1/research/runs", json=body, headers=headers).status_code == 409
    body["selected_chunk_ids"] *= 2
    assert client.post("/api/v1/research/runs", json=body, headers=headers).status_code == 422


def test_selected_context_prevents_reading_outside_selection(research):  # noqa: F811
    client, headers, database = research
    sources = client.get("/api/v1/research/runs/context?q=validation", headers=headers).json()[
        "items"
    ]
    create(research, selected_chunk_ids=[sources[0]["chunk_id"]])

    async def check():
        run = await claim(database)
        state = dict(run.checkpoint)
        state["plan"] = ["Read selected evidence", "Check findings"]
        result, terminal = await execute_tool(
            database,
            ScriptedModel(),
            run,
            state,
            proposal("read_sources", {"chunk_ids": [str(uuid4())]}),
        )
        assert result["error"] == "outside_selected_context"
        assert terminal is None
        result, terminal = await execute_tool(
            database,
            ScriptedModel(),
            run,
            state,
            proposal("read_sources", {"chunk_ids": [sources[0]["chunk_id"]]}),
        )
        assert result["sources"][0]["chunk_id"] == sources[0]["chunk_id"]

    asyncio.run(check())


def test_acl_filter_matches_public_policy_and_stale_context_stops(research):  # noqa: F811
    client, headers, database = research
    sources = client.get("/api/v1/research/runs/context?q=validation", headers=headers).json()[
        "items"
    ]
    chunk_id = sources[0]["chunk_id"]
    create(research, selected_chunk_ids=[chunk_id])

    async def check():
        run = await claim(database)
        async with database.session_factory() as session:
            chunk = await session.get(DocumentChunk, chunk_id)
            original = chunk.acl
            try:
                for acl, allowed in [
                    (None, True),
                    ({}, True),
                    ({"roles": []}, True),
                    ({"roles": ["reviewer", "viewer"]}, True),
                    ({"roles": ["reviewer"]}, False),
                    ({"roles": None}, False),
                    ({"roles": "viewer"}, False),
                    ([], False),
                ]:
                    chunk.acl = acl
                    await session.commit()
                    matches = await search_sources(database, "validation", [chunk_id])
                    assert bool(matches) == allowed
                chunk.acl = {"roles": ["reviewer"]}
                await session.commit()
                result, terminal = await execute_tool(
                    database,
                    ScriptedModel(),
                    run,
                    dict(run.checkpoint),
                    proposal("plan_research", {"steps": ["Read", "Check"]}),
                )
                assert result["error"] == "selected_context_changed"
                assert terminal == "insufficient_evidence"
            finally:
                chunk.acl = original
                await session.commit()

    asyncio.run(check())
