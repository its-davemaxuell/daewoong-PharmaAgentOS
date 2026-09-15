"""Corpus-aware lexical weights and contiguous evidence windows.

Compute weights only after authorization. Common warning-letter boilerplate must
not outrank topic-specific passages just because a question mentions the corpus.
"""
import re
from collections import Counter
from math import log


def query_weights(query: set[str], documents: list[set[str]]) -> dict[str, float]:
    frequency = Counter(token for document in documents for token in query & document)
    count = len(documents)
    return {token: 1 + log((count + 1) / (seen + 1)) for token, seen in frequency.items()}


def relevant_excerpt(content: str, weights: dict[str, float], limit: int = 800) -> str:
    if len(content) <= limit or not weights:
        return content[:limit]
    starts = [0, *(match.end() for match in re.finditer(r"\n+|(?<=[.!?])\s+", content))]
    best_start, best_score = 0, -1.0
    for start in starts:
        window = content[start:start + limit]
        tokens = set(re.findall(r"[^\W_]{2,}", window.casefold()))
        score = sum(weights.get(token, 0) for token in tokens)
        if score > best_score:
            best_start, best_score = start, score
    return content[best_start:best_start + limit]
