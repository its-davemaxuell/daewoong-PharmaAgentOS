"""Personal acknowledgments never confer governed QA or operational authority."""

from fastapi import HTTPException

from app.models import Case
from app.security.auth import Principal

PERSONAL_WORKFLOW = "personal-regulatory-impact-review"


def personal_case(case: Case) -> bool:
    return case.workflow_key == PERSONAL_WORKFLOW


def personal_owner(case: Case, principal: Principal) -> bool:
    return personal_case(case) and case.owner_subject == principal.subject


def require_review(case: Case, principal: Principal) -> None:
    if personal_case(case):
        if personal_owner(case, principal):
            return
        raise HTTPException(404, "Case not found")
    if "reviewer" not in principal.roles:
        raise HTTPException(403, "Independent reviewer role is required")
