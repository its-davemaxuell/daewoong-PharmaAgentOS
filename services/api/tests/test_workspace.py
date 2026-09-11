import asyncio
from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select

from app.models import (
    ChangeEvent,
    ResearchRun,
    Subscription,
    WarningLetter,
    WorkspaceInboxPreference,
    utcnow,
)
from app.routes.letter_search import catalog_scope


def owner():
    return {"X-Dev-User": "workspace-" + uuid4().hex, "X-Dev-Roles": "viewer"}


def test_inbox_preview_does_not_establish_or_change_horizon(client):
    headers = owner()

    async def horizon():
        async with client.app.state.database.session_factory() as session:
            preference = await session.get(WorkspaceInboxPreference, headers["X-Dev-User"])
            return preference.starts_at if preference else None

    preview = client.get("/api/v1/workspace/inbox?preview=true", headers=headers)
    assert preview.status_code == 200, preview.text
    assert "no-store" in preview.headers["cache-control"]
    assert asyncio.run(horizon()) is None
    assert client.get("/api/v1/workspace/inbox?preview=true", headers=headers).status_code == 200
    assert asyncio.run(horizon()) is None

    visit = client.get("/api/v1/workspace/inbox", headers=headers)
    assert visit.status_code == 200
    established = asyncio.run(horizon())
    assert established is not None
    later = client.get("/api/v1/workspace/inbox?preview=true", headers=headers)
    assert later.json()["starts_at"] == visit.json()["starts_at"]
    assert asyncio.run(horizon()) == established


def test_inbox_personal_revision_and_horizon(client):
    headers, other = owner(), owner()

    async def recent():
        async with client.app.state.database.session_factory() as session:
            event = await session.scalar(
                select(ChangeEvent).join(WarningLetter).where(*catalog_scope()).limit(1)
            )
            event.detected_at = utcnow()
            await session.commit()
            return event.id

    event_id = asyncio.run(recent())
    initial = client.get("/api/v1/workspace/inbox", headers=headers)
    assert initial.status_code == 200, initial.text
    assert any(item["id"] == event_id for item in initial.json()["items"])
    url = f"/api/v1/workspace/inbox/{event_id}"
    assert (
        client.patch(
            url, headers=headers, json={"state": "dismissed", "expected_revision": 0}
        ).status_code
        == 422
    )
    result = client.patch(url, headers=headers, json={"state": "later", "expected_revision": 0})
    assert result.status_code == 200, result.text
    assert result.json()["revision"] == 1
    assert (
        client.patch(
            url, headers=headers, json={"state": "done", "expected_revision": 0}
        ).status_code
        == 409
    )
    assert any(
        item["id"] == event_id
        for item in client.get("/api/v1/workspace/inbox", headers=other).json()["items"]
    )

    async def old():
        async with client.app.state.database.session_factory() as session:
            pref = await session.get(WorkspaceInboxPreference, headers["X-Dev-User"])
            pref.starts_at = utcnow() - timedelta(days=100)
            event = await session.get(ChangeEvent, event_id)
            event.detected_at = utcnow() - timedelta(days=60)
            await session.commit()

    asyncio.run(old())
    assert any(
        item["id"] == event_id
        for item in client.get("/api/v1/workspace/inbox?state=later", headers=headers).json()[
            "items"
        ]
    )


def test_snapshot_ownership_idempotence_and_version_binding(client):
    headers, other = owner(), owner()

    async def create():
        async with client.app.state.database.session_factory() as session:
            run = ResearchRun(
                owner_id=headers["X-Dev-User"],
                client_request_id=str(uuid4()),
                objective="Unique validation brief",
                language="en",
                status="completed",
                stage="complete",
                revision=4,
                result={
                    "title": "Unique validation brief",
                    "findings": [{"statement": "A source finding", "citation_ids": ["S1"]}],
                    "sources": [
                        {
                            "id": "S1",
                            "version_id": "v1",
                            "source_hash": "a" * 64,
                            "excerpt": "retained original",
                        }
                    ],
                },
            )
            session.add(run)
            await session.commit()
            return run.id

    run_id = asyncio.run(create())
    url = "/api/v1/research/briefs"
    payload = {"run_id": run_id, "expected_revision": 4}
    assert client.post(url, headers=other, json=payload).status_code == 404
    assert (
        client.post(url, headers=headers, json={**payload, "expected_revision": 3}).status_code
        == 409
    )
    saved = client.post(url, headers=headers, json=payload)
    assert saved.status_code == 201, saved.text
    assert client.post(url, headers=headers, json=payload).json()["id"] == saved.json()["id"]
    detail = f"{url}/{saved.json()['id']}"
    assert client.get(detail, headers=other).status_code == 404
    assert (
        client.get(detail, headers=headers).json()["snapshot"]["result"]["sources"][0]["version_id"]
        == "v1"
    )
    assert "no-store" in client.get(detail + "/export", headers=headers).headers["cache-control"]
    assert client.patch(detail, headers=headers, json={}).status_code == 405
    assert (
        client.get("/api/v1/workspace/search?q=Unique", headers=other).json()["groups"][2]["items"]
        == []
    )
    assert client.get("/api/v1/workspace/search?q=Unique&kind=briefs", headers=headers).json()[
        "groups"
    ][0]["items"]


def test_research_list_pagination_and_filter(client):
    headers = owner()

    async def seed():
        async with client.app.state.database.session_factory() as session:
            session.add_all(
                [
                    ResearchRun(
                        owner_id=headers["X-Dev-User"],
                        client_request_id=str(uuid4()),
                        objective=f"Pagination {i}",
                        language="en",
                        status="completed",
                        stage="complete",
                    )
                    for i in range(35)
                ]
            )
            await session.commit()

    asyncio.run(seed())
    first = client.get("/api/v1/research/runs?status=completed", headers=headers).json()
    assert len(first["items"]) == 30 and first["has_more"]
    second = client.get(
        "/api/v1/research/runs",
        params={"cursor": first["next_cursor"], "status": "completed"},
        headers=headers,
    ).json()
    assert len(second["items"]) == 5
    assert client.get("/api/v1/research/runs?status=active", headers=headers).json()["items"] == []


def test_saved_view_revision_and_bounded_bookmark_lookup(client):
    headers = owner()
    letter_id = str(uuid4())

    async def seed():
        async with client.app.state.database.session_factory() as session:
            session.add_all(
                [
                    Subscription(
                        owner_id=headers["X-Dev-User"], name=f"View {i}", destination_id=""
                    )
                    for i in range(105)
                ]
            )
            bookmark = Subscription(
                owner_id=headers["X-Dev-User"],
                name=f"Drug letter bookmark:{letter_id}",
                destination_id="",
                updated_at=utcnow() - timedelta(days=1),
            )
            session.add(bookmark)
            await session.commit()
            return bookmark.id

    bookmark_id = asyncio.run(seed())
    result = client.get(
        "/api/v1/saved-views", headers=headers, params={"source_ids": letter_id, "limit": 100}
    ).json()
    assert [item["id"] for item in result["items"]] == [bookmark_id]
    assert result["items"][0]["source_id"] == letter_id
    named = client.get("/api/v1/saved-views?kind=source_view&limit=20", headers=headers).json()
    assert len(named["items"]) == 20 and named["has_more"]
    item = named["items"][0]
    update = {
        "name": "Edited view",
        "expected_revision": item["revision"],
        "display": {"sort": "company-asc", "pageSize": 50},
    }
    url = f"/api/v1/saved-views/{item['id']}"
    saved = client.patch(url, headers=headers, json=update)
    assert saved.status_code == 200, saved.text
    assert saved.json()["revision"] == item["revision"] + 1
    assert "sort=company-asc&pageSize=50" in saved.json()["open_url"]
    assert client.patch(url, headers=headers, json=update).status_code == 409
    assert client.patch(url, headers=owner(), json=update).status_code == 404
    malformed_display = {"display": {"sort": [], "pageSize": {}}}
    assert client.patch(url, headers=headers, json=malformed_display).status_code == 200
