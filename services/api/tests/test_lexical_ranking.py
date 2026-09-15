from app.lexical_ranking import query_weights, relevant_excerpt


def test_topic_passage_outweighs_repeated_corpus_boilerplate():
    query = set("quality unit oversight drug warning letters inspection".split())
    boilerplate = set("drug warning letters inspection facility".split())
    topic = set("quality unit oversight failed procedures".split())
    weights = query_weights(query, [boilerplate] * 25 + [topic])
    assert sum(weights[word] for word in query & topic) > sum(
        weights[word] for word in query & boilerplate
    )


def test_citation_window_contains_the_ranked_evidence_and_is_an_exact_span():
    source = "Generic inspection introduction. " * 40 + "Quality unit oversight was inadequate."
    excerpt = relevant_excerpt(source, {"quality": 5, "unit": 5, "oversight": 5})
    assert "Quality unit oversight was inadequate." in excerpt
    assert excerpt in source
    assert len(excerpt) <= 800
