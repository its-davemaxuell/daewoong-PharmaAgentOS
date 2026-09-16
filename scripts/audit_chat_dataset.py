"""Exercise natural dataset lookup and mixed search requests against the hosted chat."""

import audit_chat_questions

audit_chat_questions.QUESTIONS = [
    ("latest", "what are the latest FDA letters"),
    ("this-month", "what is the letter that went out this month"),
    ("from-month", "List all letters from this month"),
    ("new", "Show me new letters"),
    ("ten", "Show the 10 most recent letters"),
    ("dataset", "What is new in our dataset?"),
    ("recent-companies", "Which companies received letters recently?"),
    ("posted", "Which letters appeared on the FDA site last month?"),
    ("month-ko", "이번 달에 나온 FDA 서한을 보여줘"),
    ("latest-ko", "최신 FDA 경고서한 10개를 보여줘"),
    ("group", "Break down the 2025 letters by recipient country"),
    ("mixed", "Find the two latest warning letters and summarize their findings."),
    ("empty", "Show letters issued in September 2099"),
    ("phrase", 'Which letters contain the exact phrase "data integrity" in 2025?'),
    ("semantic-catalog", "Bring up the recently published notices"),
    ("semantic-count", "Tally the recipients in our records"),
    ("topic-recency", "Latest FDA letters about data integrity"),
    ("unsupported", "Show letters added to our database today"),
]

if __name__ == "__main__":
    audit_chat_questions.main()
