"""Checks shared by private tool boundaries before any result is released."""

import json

from app.cases.hashing import canonical_sha256


def bounded_result(result, tool_name, maximum_characters, *, expected_hash=None):
    if not isinstance(result, dict) or result.get("tool_name") != tool_name:
        raise ValueError("Tool result identity mismatch")
    if result.get("tool_version") != "1.0.0":
        raise ValueError("Tool result version mismatch")
    if len(json.dumps(result, ensure_ascii=False, allow_nan=False)) > maximum_characters:
        raise ValueError("Tool result exceeds its declared size limit")
    if expected_hash is not None and canonical_sha256(result) != expected_hash:
        raise ValueError("Stored tool result integrity mismatch")
    return result


def same_actor(invocation, context):
    return (
        invocation.principal_subject == context.principal.subject
        and invocation.agent_name == context.agent_name
        and invocation.agent_version == context.agent_version
        and invocation.runtime_service == context.runtime_service
    )
