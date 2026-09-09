import asyncio
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import update

from app.database import Database
from app.models import ChatMessage


def conversation(client: TestClient, headers: dict[str, str]) -> dict:
    thread = client.post(
        "/api/v1/chat/threads", headers=headers, json={"title": "Workspace test"}
    ).json()
    response = client.post(
        "/api/v1/rag/query",
        headers=headers,
        json={
            "question": "Summarize FDA cleaning validation findings",
            "thread_id": thread["id"],
            "client_message_id": str(uuid4()),
        },
    )
    assert response.status_code == 200, response.text
    return client.get(f"/api/v1/chat/threads/{thread['id']}", headers=headers).json()


def test_pin_archive_restore_and_literal_search(client, viewer_headers):
    headers = {**viewer_headers, "X-Dev-User": "workspace-organize"}
    first = conversation(client, headers)
    second = conversation(client, headers)
    path = f"/api/v1/chat/threads/{first['id']}"
    response = client.patch(path, headers=headers, json={"pinned": True, "title": "QA 100%_review"})
    assert response.status_code == 200
    assert response.json()["pinned_at"]
    assert (
        client.get("/api/v1/chat/threads", headers=headers).json()["items"][0]["id"] == first["id"]
    )
    found = client.get("/api/v1/chat/threads", headers=headers, params={"q": "%_"}).json()
    assert [item["id"] for item in found["items"]] == [first["id"]]
    assert client.patch(path, headers=headers, json={"archived": True}).status_code == 200
    archived = client.get("/api/v1/chat/threads?archived_only=true", headers=headers).json()
    assert [item["id"] for item in archived["items"]] == [first["id"]]
    assert client.patch(path, headers=headers, json={"pinned": False}).status_code == 409
    assert client.patch(path, headers=headers, json={"archived": False}).status_code == 200
    assert client.patch(path, headers=headers, json={"pinned": False}).json()["pinned_at"] is None
    for field in ("title", "pinned", "active_letter_ids", "archived"):
        assert client.patch(path, headers=headers, json={field: None}).status_code == 422
    assert second["id"] != first["id"]


def test_feedback_is_persisted_reversible_and_owner_scoped(client, viewer_headers):
    thread = conversation(client, viewer_headers)
    base = f"/api/v1/chat/threads/{thread['id']}"
    answer = thread["messages"][-1]
    endpoint = f"{base}/messages/{answer['id']}/feedback"
    other = {**viewer_headers, "X-Dev-User": "different-browser"}
    assert client.put(endpoint, headers=other, json={"rating": "helpful"}).status_code == 404
    for rating in ("helpful", "unhelpful", None):
        response = client.put(endpoint, headers=viewer_headers, json={"rating": rating})
        assert response.status_code == 200
        saved = client.get(base, headers=viewer_headers).json()["messages"][-1]
        assert saved["feedback_rating"] == rating
    assert (
        client.put(endpoint, headers=viewer_headers, json={"rating": "invalid"}).status_code == 422
    )
    user_endpoint = f"{base}/messages/{thread['messages'][0]['id']}/feedback"
    assert (
        client.put(user_endpoint, headers=viewer_headers, json={"rating": "helpful"}).status_code
        == 404
    )


def test_branch_preserves_evidence_without_overwriting_history(client, viewer_headers):
    original = conversation(client, viewer_headers)
    base = f"/api/v1/chat/threads/{original['id']}"
    response = client.post(
        f"{base}/branch",
        headers=viewer_headers,
        json={
            "message_id": original["messages"][-1]["id"],
        },
    )
    assert response.status_code == 201, response.text
    branch = response.json()
    assert branch["id"] != original["id"]
    for source, copied in zip(original["messages"], branch["messages"], strict=True):
        assert source["id"] != copied["id"]
        assert source["content"] == copied["content"]
        assert source["citations"] == copied["citations"]
        assert source["created_at"] == copied["created_at"]
        assert copied["client_message_id"] is None
        assert copied["feedback_rating"] is None
    assert client.get(base, headers=viewer_headers).json() == original
    edit = client.post(
        f"{base}/branch",
        headers=viewer_headers,
        json={
            "message_id": original["messages"][0]["id"],
            "include_message": False,
        },
    )
    assert edit.status_code == 201
    assert edit.json()["messages"] == []
    other = {**viewer_headers, "X-Dev-User": "branch-intruder"}
    assert (
        client.post(
            f"{base}/branch",
            headers=other,
            json={
                "message_id": original["messages"][-1]["id"],
            },
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"{base}/branch",
            headers=viewer_headers,
            json={
                "message_id": str(uuid4()),
            },
        ).status_code
        == 404
    )


def test_export_contains_saved_sources_and_enforces_ownership(client, viewer_headers):
    thread = conversation(client, viewer_headers)
    path = f"/api/v1/chat/threads/{thread['id']}/export"
    exported = client.get(path, headers=viewer_headers)
    assert exported.status_code == 200
    content = exported.json()["content"]
    assert thread["messages"][0]["content"] in content
    assert thread["messages"][-1]["content"] in content
    for citation in thread["messages"][-1]["citations"]:
        assert citation["source_url"] in content
        assert citation["excerpt"] in content
    assert "owner_subject" not in client.get(path + "?format=json", headers=viewer_headers).text
    assert (
        client.get(path, headers={**viewer_headers, "X-Dev-User": "export-intruder"}).status_code
        == 404
    )
    assert client.get(path + "?format=html", headers=viewer_headers).status_code == 422


def test_branch_excludes_future_turns_and_can_continue(client, viewer_headers):
    first = conversation(client, viewer_headers)
    base = f"/api/v1/chat/threads/{first['id']}"
    assert (
        client.post(
            "/api/v1/rag/query",
            headers=viewer_headers,
            json={
                "question": "Explain FDA laboratory control failures",
                "thread_id": first["id"],
                "client_message_id": str(uuid4()),
            },
        ).status_code
        == 200
    )
    branch = client.post(
        base + "/branch",
        headers=viewer_headers,
        json={
            "message_id": first["messages"][-1]["id"],
        },
    ).json()
    assert len(branch["messages"]) == 2
    assert len(client.get(base, headers=viewer_headers).json()["messages"]) == 4
    assert (
        client.post(
            "/api/v1/rag/query",
            headers=viewer_headers,
            json={
                "question": "Summarize FDA requested validation actions",
                "thread_id": branch["id"],
                "client_message_id": str(uuid4()),
            },
        ).status_code
        == 200
    )
    assert (
        len(
            client.get(
                f"/api/v1/chat/threads/{branch['id']}",
                headers=viewer_headers,
            ).json()["messages"]
        )
        == 4
    )
    assert (
        client.post(
            base + "/branch",
            headers=viewer_headers,
            json={
                "message_id": first["messages"][0]["id"],
            },
        ).status_code
        == 422
    )


def test_pending_branch_and_archived_feedback_are_rejected(client, viewer_headers):
    thread = conversation(client, viewer_headers)
    base = f"/api/v1/chat/threads/{thread['id']}"
    message_id = thread["messages"][-1]["id"]
    assert client.patch(base, headers=viewer_headers, json={"archived": True}).status_code == 200
    assert (
        client.put(
            f"{base}/messages/{message_id}/feedback",
            headers=viewer_headers,
            json={
                "rating": "helpful",
            },
        ).status_code
        == 409
    )

    async def mark_pending():
        database = Database(client.app.state.settings.database_url)
        try:
            async with database.session_factory() as session:
                await session.execute(
                    update(ChatMessage)
                    .where(
                        ChatMessage.id == message_id,
                    )
                    .values(status="pending")
                )
                await session.commit()
        finally:
            await database.dispose()

    asyncio.run(mark_pending())
    assert (
        client.post(
            base + "/branch",
            headers=viewer_headers,
            json={
                "message_id": message_id,
            },
        ).status_code
        == 409
    )
