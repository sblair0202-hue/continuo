import anthropic
from datetime import datetime


def generate_daily_brief(signals: list, tasks: list, meetings: list, accounts: list) -> str:
    high_signals = [s for s in signals if s.status == "new" and s.impact_level in ("high", "medium")]
    open_tasks = [t for t in tasks if t.status == "open" and t.priority == "high"]

    signal_lines = "\n".join(
        f"- [{s.signal_type.upper()}] {s.title}" + (f" → {s.suggested_action}" if s.suggested_action else "")
        for s in high_signals[:8]
    ) or "None"

    task_lines = "\n".join(f"- {t.title}" for t in open_tasks[:5]) or "None"

    meeting_lines = "\n".join(
        f"- {m.get('title', '(No title)')} at {m.get('start', '')}"
        for m in meetings[:5]
    ) or "None scheduled"

    momentum_summary = {}
    for a in accounts:
        m = getattr(a, "momentum", "unknown") or "unknown"
        momentum_summary[m] = momentum_summary.get(m, 0) + 1

    momentum_str = ", ".join(f"{v} {k}" for k, v in momentum_summary.items() if k != "unknown")

    prompt = f"""You are an AI Chief of Staff briefing a medical device sales rep at the start of their day.

Today is {datetime.now().strftime('%A, %B %d')}.

Territory momentum: {momentum_str or 'no data yet'}

Today's meetings:
{meeting_lines}

High/medium impact signals requiring attention:
{signal_lines}

High-priority open tasks:
{task_lines}

Write a 4-6 sentence daily brief covering:
1. The single most important thing to focus on today
2. Any meetings that need preparation or follow-up
3. The top signal or risk in the territory
4. One concrete action to drive momentum

Be direct, specific, and motivating. Write in second person ("You have...", "Your top priority..."). No bullet points — flowing prose only."""

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=350,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
