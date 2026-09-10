"""Database-enforced snapshot integrity on the disposable PostgreSQL CI service."""

import os
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.database import Database

pytestmark = pytest.mark.skipif(
    os.getenv("AGENT_OS_POSTGRES_TEST") != "1", reason="requires isolated PostgreSQL"
)


@pytest.mark.asyncio
async def test_snapshot_database_guards_and_browser_denial():
    database = Database(os.environ["DATABASE_URL"])
    run_id, brief_id = str(uuid4()), str(uuid4())
    async with database.engine.begin() as connection:
        await connection.execute(
            text(
                "INSERT INTO research_runs(id,owner_id,client_request_id,objective,"
                "language,status,stage,"
                "revision,checkpoint,model_calls,total_tokens,resumes,created_at,updated_at) "
                "VALUES(:id,'workspace-pg',:id,'Fixture review','en','completed','complete',"
                "1,'{}',0,0,0,now(),now())"
            ),
            {"id": run_id},
        )
        await connection.execute(
            text(
                "INSERT INTO research_brief_snapshots(id,owner_id,run_id,run_revision,"
                "title,snapshot,content_hash,created_at) "
                "VALUES(:id,'workspace-pg',:run,1,'Fixture','{}',:hash,now())"
            ),
            {"id": brief_id, "run": run_id, "hash": "a" * 64},
        )
    for statement in [
        "UPDATE research_brief_snapshots SET title='changed' WHERE id=:id",
        "DELETE FROM research_brief_snapshots WHERE id=:id",
    ]:
        with pytest.raises(Exception, match="immutable"):
            async with database.engine.begin() as connection:
                await connection.execute(text(statement), {"id": brief_id})
    async with database.engine.begin() as connection:
        assert (
            await connection.execute(
                text("SELECT relrowsecurity FROM pg_class WHERE relname='research_brief_snapshots'")
            )
        ).scalar_one()
        for role in [
            "anon",
            "authenticated",
            "fda_readonly_runtime",
            "fda_worker_runtime",
            "pharma_orchestrator_runtime",
            "pharma_mcp_runtime",
        ]:
            exists = (
                await connection.execute(
                    text("SELECT 1 FROM pg_roles WHERE rolname=:role"), {"role": role}
                )
            ).scalar()
            if exists:
                assert not (
                    await connection.execute(
                        text(
                            "SELECT has_table_privilege(:role,'research_brief_snapshots','SELECT')"
                        ),
                        {"role": role},
                    )
                ).scalar()
    async with database.engine.begin() as connection:
        await connection.execute(text("SET LOCAL ROLE fda_api_runtime"))
        assert (
            await connection.execute(
                text("SELECT count(*) FROM research_brief_snapshots WHERE id=:id"),
                {"id": brief_id},
            )
        ).scalar_one() == 1
        await connection.execute(
            text(
                "INSERT INTO workspace_inbox_preferences(owner_id,starts_at) VALUES(:owner,now())"
            ),
            {"owner": f"workspace-pg-{brief_id}"},
        )
    await database.dispose()
