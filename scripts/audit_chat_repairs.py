"""Repeat the weak-response question matrix against the actual hosted chatbot."""

from audit_chat_questions import main
import audit_chat_questions

audit_chat_questions.QUESTIONS = [
    ("mentions", "How many FDA warning letters mention contamination?"),
    ("quoted", 'Count FDA warning letters mentioning "data integrity" in 2025.'),
    ("mentions-ko", "2025년에 데이터 무결성을 언급한 FDA 경고서한은 몇 건인가요?"),
    ("fiscal", "How many FDA warning letters were issued in fiscal year 2025?"),
    ("fiscal-quarter", "Count FDA warning letters issued in Q1 FY2025."),
    ("countries", "Count FDA warning letters from India and China in 2025."),
    (
        "countries-group",
        "Compare FDA warning letter counts for India and China in 2025 by country.",
    ),
    ("years", "Compare FDA warning letter counts in 2024 and 2026."),
    ("months", "How many FDA warning letters were issued in the past 3 months?"),
    ("quarter", "Count FDA warning letters issued last quarter."),
    ("week", "Count FDA warning letters issued last week."),
    ("companies", "How many companies received FDA warning letters in 2025?"),
    ("zero-term", 'Count FDA warning letters mentioning "PharmaAgentOS nonexistent test phrase".'),
    ("ambiguous", "Count FDA warning letters issued before 03/04/2025."),
    ("observations", "How many observations are in FDA warning letters issued in 2025?"),
]

if __name__ == "__main__":
    main()
