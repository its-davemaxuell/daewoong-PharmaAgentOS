from fastapi.testclient import TestClient

from app.routes import core


def test_postgres_array_facets_name_the_function_result_column():
    from types import SimpleNamespace

    from sqlalchemy import select
    from sqlalchemy.dialects import postgresql

    from app.models import WarningLetter
    from app.routes.letter_search import array_values

    dialect = postgresql.dialect()
    session = SimpleNamespace(bind=SimpleNamespace(dialect=dialect))
    values = array_values(session, WarningLetter.drug_subtypes)
    sql = str(select(values.c.value).compile(dialect=dialect))
    assert "json_array_elements_text" in sql
    assert "AS anon_1(value)" in sql


def test_search_remains_browsable_beyond_ten_thousand_records(client, viewer_headers, monkeypatch):
    from sqlalchemy import delete, insert

    from app.models import WarningLetter

    ids = [f"99999999-1111-4111-8111-{index:012d}" for index in range(10020)]

    async def populate():
        async with client.app.state.database.session_factory() as session:
            await session.execute(
                insert(WarningLetter),
                [
                    {
                        "id": identifier,
                        "company_name": "Fictional scale fixture",
                        "canonical_url": f"https://www.fda.gov/fictional/{identifier}",
                        "current_in_scope": True,
                        "scope_status": "IN_SCOPE_DRUGS",
                        "normalized_product_classes": ["Drugs"],
                    }
                    for identifier in ids
                ],
            )
            await session.commit()

    async def cleanup():
        async with client.app.state.database.session_factory() as session:
            await session.execute(delete(WarningLetter).where(WarningLetter.id.in_(ids)))
            await session.commit()

    context_sizes = []
    original = core._letter_context

    async def measured(session, letters):
        context_sizes.append(len(letters))
        return await original(session, letters)

    monkeypatch.setattr(core, "_letter_context", measured)
    client.portal.call(populate)
    try:
        first = client.get("/api/v1/letters/search", headers=viewer_headers).json()
        last = client.get("/api/v1/letters/search?page=502", headers=viewer_headers).json()
        assert first["total"] == 10024
        assert len(first["items"]) == 20
        assert len(last["items"]) == 4
        assert context_sizes == [20, 4]
    finally:
        client.portal.call(cleanup)


def test_search_pages_and_facets_are_bounded(client, viewer_headers, monkeypatch):
    sizes = []
    original = core._letter_context

    async def measured(session, letters):
        sizes.append(len(letters))
        return await original(session, letters)

    monkeypatch.setattr(core, "_letter_context", measured)
    assert client.get("/api/v1/letters/search").status_code == 401
    first = client.get("/api/v1/letters/search?page_size=2", headers=viewer_headers)
    assert first.status_code == 200, first.text
    data = first.json()
    assert data["total"] == 4
    assert len(data["items"]) == 2
    assert "country" in data["facets"]
    second = client.get("/api/v1/letters/search?page_size=2&page=2", headers=viewer_headers).json()
    assert len({item["id"] for item in data["items"] + second["items"]}) == 4
    assert sizes == [2, 2]
    empty = client.get("/api/v1/letters/search?q=NO_MATCH_FICTIONAL", headers=viewer_headers).json()
    assert empty["total"] == 0 and empty["items"] == []
    assert empty["collectionTotal"] == 4
    assert empty["facets"] == data["facets"]
    for query in [
        "page=1.5",
        "page_size=101",
        "posted_from=2026-02-30",
        "posted_from=2026-09-10&posted_to=2026-01-01",
    ]:
        assert (
            client.get(f"/api/v1/letters/search?{query}", headers=viewer_headers).status_code == 422
        )


def test_search_every_facet_matches_returned_metadata(client, viewer_headers):
    facets = client.get("/api/v1/letters/search", headers=viewer_headers).json()["facets"]
    for key, values in facets.items():
        for value in values:
            response = client.get(
                "/api/v1/letters/search", params={key: value["value"]}, headers=viewer_headers
            )
            assert response.status_code == 200, response.text
            assert response.json()["total"] == value["count"], (key, value, response.json())


def test_catalog_preserves_scope_and_existing_metadata(
    client: TestClient, viewer_headers: dict[str, str]
) -> None:
    assert client.get("/api/v1/letters/catalog").status_code == 401
    expected = client.get("/api/v1/letters?limit=100", headers=viewer_headers).json()
    actual = client.get("/api/v1/letters/catalog", headers=viewer_headers)
    assert actual.status_code == 200
    assert actual.json() == expected
    assert all(item["current_in_scope"] for item in actual.json()["items"])
    assert all(item["scope_status"] == "IN_SCOPE_DRUGS" for item in actual.json()["items"])
    assert all("original_sections" not in item for item in actual.json()["items"])


def test_catalog_bounds_context_work_to_each_page(
    client: TestClient, viewer_headers: dict[str, str], monkeypatch
) -> None:
    context_sizes = []
    original = core._letter_context

    async def measured_context(session, letters):
        context_sizes.append(len(letters))
        return await original(session, letters)

    monkeypatch.setattr(core, "_letter_context", measured_context)
    first = client.get("/api/v1/letters/catalog?limit=2", headers=viewer_headers).json()
    assert first["has_more"]
    second = client.get(
        f"/api/v1/letters/catalog?limit=2&cursor={first['next_cursor']}", headers=viewer_headers
    ).json()
    assert not second["has_more"]
    assert context_sizes == [2, 2]
    assert len({item["id"] for item in first["items"] + second["items"]}) == 4
    for query, status in [("limit=1001", 422), ("limit=0", 422), ("cursor=invalid", 400)]:
        response = client.get(f"/api/v1/letters/catalog?{query}", headers=viewer_headers)
        assert response.status_code == status
