import asyncio
from datetime import timedelta

from app.database import Database
from app.models import ChatThread, RagQuery, ResearchRun, utcnow


def test_usage_is_owner_scoped_and_excludes_older_activity(client, viewer_headers):
    async def populate():
        database = Database(client.app.state.settings.database_url)
        try:
            async with database.session_factory() as session:
                for owner, days, tokens in [
                    ("usage-owner", 1, 123),
                    ("usage-other", 1, 999),
                    ("usage-owner", 31, 456),
                ]:
                    created = utcnow() - timedelta(days=days)
                    session.add(
                        ChatThread(owner_subject=owner, title="Private title", created_at=created)
                    )
                    session.add(
                        RagQuery(
                            actor_id=owner,
                            query_sha256="a" * 64,
                            query_length=12,
                            created_at=created,
                        )
                    )
                    session.add(
                        ResearchRun(
                            owner_id=owner,
                            client_request_id=f"{owner}-{days}",
                            objective="Private objective",
                            language="en",
                            model_calls=2,
                            total_tokens=tokens,
                            created_at=created,
                        )
                    )
                await session.commit()
        finally:
            await database.dispose()

    asyncio.run(populate())
    headers = {**viewer_headers, "X-Dev-User": "usage-owner"}
    result = client.get("/api/v1/chat/threads/usage?owner=usage-other", headers=headers)
    assert result.status_code == 200, result.text
    report = result.json()
    assert report["scope"] == "personal"
    assert report["conversations"] == 1
    assert report["chat_requests"] == 1
    assert report["research_runs"] == 1
    assert report["research_model_calls"] == 2
    assert report["research_tokens"] == 123
    assert "Private" not in result.text
    empty = client.get(
        "/api/v1/chat/threads/usage", headers={**viewer_headers, "X-Dev-User": "usage-empty"}
    ).json()
    assert empty["conversations"] == empty["research_tokens"] == empty["chat_requests"] == 0
