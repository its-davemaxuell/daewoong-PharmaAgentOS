import pytest
from fastapi import HTTPException
from test_cases_api import _case_payload

from app.cases.policy import PERSONAL_WORKFLOW, require_review
from app.cases.router import _require_case_read, _require_case_write
from app.models import Case
from app.security.auth import Principal


def test_personal_owner_can_write_and_acknowledge_without_elevated_roles():
    case = Case(workflow_key=PERSONAL_WORKFLOW, owner_subject="browser-one")
    owner = Principal("browser-one", frozenset({"viewer"}))
    _require_case_read(case, owner)
    _require_case_write(case, owner)
    require_review(case, owner)


@pytest.mark.parametrize("roles", [{"viewer"}, {"reviewer"}, {"system_owner"}])
def test_personal_work_is_not_shared_with_other_visitors_or_staff(roles):
    case = Case(workflow_key=PERSONAL_WORKFLOW, owner_subject="browser-one")
    other = Principal("browser-two", frozenset(roles))
    for operation in (_require_case_read, _require_case_write, require_review):
        with pytest.raises(HTTPException) as failure:
            operation(case, other)
        assert failure.value.status_code == 404


def test_personal_acknowledgment_does_not_grant_governed_authority():
    case = Case(workflow_key="regulatory-impact-review", owner_subject="browser-one")
    owner = Principal("browser-one", frozenset({"viewer"}))
    for operation in (_require_case_write, require_review):
        with pytest.raises(HTTPException) as failure:
            operation(case, owner)
        assert failure.value.status_code == 403


def test_personal_case_api_is_gated_and_owner_scoped(client, monkeypatch):
    from uuid import uuid4

    headers = {
        "X-Dev-User": "personal-browser",
        "X-Dev-Roles": "viewer",
        "Idempotency-Key": "personal:" + uuid4().hex,
    }
    payload = {**_case_payload(client), "workflow_key": PERSONAL_WORKFLOW}
    assert client.post("/api/v1/cases", json=payload, headers=headers).status_code == 503
    monkeypatch.setattr(client.app.state.settings, "personal_case_enabled", True)
    response = client.post("/api/v1/cases", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    case_id = response.json()["id"]
    assert response.json()["owner_subject"] == headers["X-Dev-User"]
    other = {"X-Dev-User": "another-browser", "X-Dev-Roles": "viewer"}
    assert client.get(f"/api/v1/cases/{case_id}", headers=other).status_code == 404
    assert case_id not in {
        item["id"] for item in client.get("/api/v1/cases", headers=other).json()["items"]
    }
    governed = {**payload, "workflow_key": "regulatory-impact-review"}
    assert client.post("/api/v1/cases", json=governed, headers=headers).status_code == 403
