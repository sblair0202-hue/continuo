"""
Territory intelligence service — AI-powered account snapshot, visit brief, and Ask Continuo.
All functions use Claude Haiku and share a singleton client.
"""
import os
import anthropic

_client: anthropic.Anthropic | None = None


def _ai() -> anthropic.Anthropic:
    global _client
    if _client is None:
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError("AI features are not configured. Contact your administrator.")
        _client = anthropic.Anthropic(api_key=key)
    return _client


def _ask(system: str, user: str, max_tokens: int = 512) -> str:
    msg = _ai().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return msg.content[0].text.strip()


# ── Account Snapshot ──────────────────────────────────────────────────────────

def generate_account_snapshot(account, contacts, signals, opps, tasks) -> str:
    champion_names = [c.name for c in contacts if c.champion_level == "champion"]
    open_opps = [o for o in opps if o.status not in ("won", "lost")]
    open_tasks = [t for t in tasks if t.status != "done"]
    recent_signals = signals[:10]

    context = f"""Account: {account.name}
Health System: {account.organization or 'Independent'}
Status: {account.status} | Momentum: {account.momentum}
Site Type: {'Implant Center' if account.is_implant_center else ''}{' + ' if account.is_implant_center and account.is_therapy_site else ''}{'Therapy Site' if account.is_therapy_site else ''}
Champions: {', '.join(champion_names) if champion_names else 'None identified'}
All Contacts: {', '.join(c.name for c in contacts) or 'None'}
Open Opportunities ({len(open_opps)}): {'; '.join(o.title for o in open_opps) or 'None'}
Open Tasks ({len(open_tasks)}): {'; '.join(t.title for t in open_tasks[:5]) or 'None'}
Recent Signals:
{chr(10).join(f'- [{s.signal_type}] {s.title}' for s in recent_signals) or 'None'}
"""

    return _ask(
        system=(
            "You are a field intelligence assistant for a medical device sales rep. "
            "Generate a concise 2-3 sentence account snapshot. Cover: current engagement status, "
            "key relationships or clinical context, and the most important active opportunity or risk. "
            "Be specific — use actual names and details from the data. Write in third person about the account."
        ),
        user=f"Generate account snapshot:\n\n{context}",
        max_tokens=256,
    )


# ── Visit Brief ───────────────────────────────────────────────────────────────

def generate_visit_brief(account, contacts, signals, tasks, opps) -> list[str]:
    open_tasks = [t for t in tasks if t.status != "done"]
    open_opps = [o for o in opps if o.status not in ("won", "lost")]
    new_signals = [s for s in signals if s.status in ("new", "active")]
    champions = [c for c in contacts if c.champion_level == "champion"]

    context = f"""Account: {account.name}
Momentum: {account.momentum} | Status: {account.status}
Next Action: {account.next_action or 'None set'}
Key Contacts: {', '.join(c.name + ' (' + (c.role or '') + ')' for c in contacts) or 'None'}
Champions: {', '.join(c.name for c in champions) or 'None'}
Open Tasks: {'; '.join(t.title for t in open_tasks[:8]) or 'None'}
Active Signals requiring attention:
{chr(10).join(f'- {s.title}' + (f' → {s.suggested_action}' if s.suggested_action else '') for s in new_signals[:10]) or 'None'}
Open Opportunities: {'; '.join(o.title + f' ({o.status})' for o in open_opps) or 'None'}
"""

    raw = _ask(
        system=(
            "You are briefing a medical device sales rep before they walk into an account. "
            "Generate a 'Before You Go' checklist of 5-8 specific, actionable items. "
            "Each item should be one concrete thing to do, ask, bring, or mention. "
            "Reference actual names, items, and context from the data. "
            "Return one item per line, starting each line with a bullet •. No headers, no extra text."
        ),
        user=f"Generate visit brief for:\n\n{context}",
        max_tokens=400,
    )

    items = [
        line.lstrip("•-* ").strip()
        for line in raw.split("\n")
        if line.strip() and not line.strip().startswith("#")
    ]
    return [i for i in items if i]


# ── Ask Continuo ──────────────────────────────────────────────────────────────

def build_territory_context(accounts, contacts, signals, tasks, opps) -> str:
    lines = ["=== ACCOUNTS ==="]
    for a in accounts:
        badges = []
        if a.is_implant_center: badges.append("Implant")
        if a.is_therapy_site: badges.append("Therapy")
        badge_str = f" [{', '.join(badges)}]" if badges else ""
        lines.append(f"• {a.name}{badge_str} | {a.status} | momentum: {a.momentum}")
        if a.next_action:
            lines.append(f"  Next action: {a.next_action}")

    lines.append("\n=== CONTACTS ===")
    for c in contacts:
        champ = " [Champion]" if c.champion_level == "champion" else ""
        acct = next((a.name for a in accounts if a.id == c.account_id), "Unknown")
        lines.append(f"• {c.name}{champ} | {c.role or '?'} | {c.discipline or ''} @ {acct}")
        if c.relationship_notes:
            lines.append(f"  Notes: {c.relationship_notes}")
        if c.phone:
            lines.append(f"  Phone: {c.phone}")

    lines.append("\n=== ACTIVE SIGNALS ===")
    for s in signals[:40]:
        acct = next((a.name for a in accounts if a.id == s.account_id), "Territory")
        lines.append(f"• [{s.signal_type}|{s.impact_level}] {s.title} @ {acct}")
        if s.suggested_action:
            lines.append(f"  → {s.suggested_action}")

    lines.append("\n=== OPEN TASKS ===")
    for t in tasks[:25]:
        acct = next((a.name for a in accounts if a.id == t.account_id), "General")
        lines.append(f"• [{t.priority}] {t.title} @ {acct}")

    lines.append("\n=== OPPORTUNITIES ===")
    for o in opps:
        acct = next((a.name for a in accounts if a.id == o.account_id), "Unknown")
        lines.append(f"• {o.title} ({o.status}) @ {acct}")

    return "\n".join(lines)


def ask_territory(question: str, territory_context: str) -> str:
    return _ask(
        system=(
            "You are Continuo, a Territory Development Assistant for Sarah Blair, a medical device sales rep. "
            "You have complete access to her territory data below. "
            "Answer questions about accounts, contacts, activities, tasks, signals, and opportunities. "
            "Be concise, specific, and actionable. When listing items, keep it brief. "
            "If something isn't in the data, say so honestly — don't guess.\n\n"
            f"TERRITORY DATA:\n{territory_context}"
        ),
        user=question,
        max_tokens=600,
    )


# ── Weekly Brief ──────────────────────────────────────────────────────────────

def generate_weekly_brief(signals, tasks, accounts, opps, meetings=None) -> str:
    from datetime import datetime, timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)

    new_signals = [s for s in signals if s.status == "new"]
    high_signals = [s for s in new_signals if s.impact_level == "high"]
    open_tasks = [t for t in tasks if t.status != "done"]
    high_tasks = [t for t in open_tasks if t.priority == "high"]
    open_opps = [o for o in opps if o.status not in ("won", "lost")]
    stalled = [o for o in open_opps if o.status == "waiting"]

    momentum_map: dict[str, int] = {}
    for a in accounts:
        m = a.momentum or "unknown"
        momentum_map[m] = momentum_map.get(m, 0) + 1

    context = f"""Date: {datetime.now().strftime('%A, %B %d')}
Territory accounts: {len(accounts)} total
  Momentum: {', '.join(f'{v} {k}' for k, v in momentum_map.items())}
Active signals: {len(new_signals)} ({len(high_signals)} high-impact)
Open tasks: {len(open_tasks)} ({len(high_tasks)} high-priority)
Open opportunities: {len(open_opps)} ({len(stalled)} stalled/waiting)
Meetings this week: {len(meetings) if meetings else 'Calendar not connected'}

High-impact signals:
{chr(10).join(f'- {s.title}' for s in high_signals[:6]) or 'None'}

High-priority tasks:
{chr(10).join(f'- {t.title}' for t in high_tasks[:5]) or 'None'}

Stalled opportunities:
{chr(10).join(f'- {o.title}' for o in stalled[:4]) or 'None'}
"""

    return _ask(
        system=(
            "You are an AI Chief of Staff giving a weekly territory briefing to Sarah Blair, "
            "a medical device sales rep, on Monday morning. "
            "Write a 5-7 sentence briefing covering: territory momentum, top opportunities to advance, "
            "accounts needing immediate attention, and one clear priority action for the week. "
            "Be direct, specific, and motivating. Write in second person. No bullet points — flowing prose."
        ),
        user=f"Generate weekly territory brief:\n\n{context}",
        max_tokens=400,
    )
