from test_cases_api import (
    ANALYST,
    OTHER_ANALYST,
    _approve_plan,
    _create_case,
    _create_plan,
    _run_one_worker_job,
    _start_run,
)


def test_inspection_uses_frozen_definition_and_authorizes_owner(client):
    case, _, _ = _create_case(client)
    plan, _, _ = _create_plan(client, case)
    _approve_plan(client, case, plan)
    run = _start_run(client, case, plan)
    _run_one_worker_job(client)
    path = f"/api/v1/runs/{run['id']}/inspection"
    response = client.get(path, headers=ANALYST)
    assert response.status_code == 200
    assert "no-store" in response.headers["cache-control"]
    data = response.json()
    assert data["workflow"] == run["checkpoint"]["workflow_template"]
    assert data["steps"][0]["title"] == plan["steps"][0]["title"]
    assert data["attempts"][0]["inputs"]["task"]["case_id"] == case["id"]
    assert data["attempts"][0]["output"] is None
    assert client.get(path, headers=OTHER_ANALYST).status_code == 403
