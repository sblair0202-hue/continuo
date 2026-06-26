import pathlib

import pytest

from app.services.field_intelligence_engine import extract_field_intelligence

TRANSCRIPT = (
    pathlib.Path(__file__).parent / "transcripts" / "ryan_todd_emily.txt"
).read_text()


@pytest.fixture(scope="module")
def result():
    return extract_field_intelligence(TRANSCRIPT)


def _signals_of_type(result, signal_type):
    return [s for s in result.signals if s.signal_type == signal_type]


def test_minimum_signal_count(result):
    assert len(result.signals) >= 7


def test_relationship_signal_emily_leaving(result):
    signals = _signals_of_type(result, "relationship")
    assert any("emily" in s.title.lower() for s in signals)


def test_risk_signal_emily_leaving(result):
    signals = _signals_of_type(result, "risk")
    assert any("emily" in s.title.lower() for s in signals)


def test_emily_signals_are_high_impact(result):
    emily_signals = [
        s for s in result.signals
        if "emily" in s.title.lower()
    ]
    assert all(s.impact_level == "high" for s in emily_signals)


def test_implementation_signal_ryan_saps(result):
    signals = _signals_of_type(result, "implementation")
    assert any("ryan" in s.title.lower() for s in signals)


def test_win_signal_ryan_saps(result):
    signals = _signals_of_type(result, "win")
    assert any("ryan" in s.title.lower() for s in signals)


def test_continuity_signal_patient_transfer(result):
    signals = _signals_of_type(result, "continuity")
    assert len(signals) >= 1


def test_milestone_signal_uedx_kit(result):
    signals = _signals_of_type(result, "milestone")
    assert any("uedx" in s.title.lower() for s in signals)


def test_opportunity_signal_patients(result):
    signals = _signals_of_type(result, "opportunity")
    assert len(signals) >= 1


def test_crm_signal_north_central_salesforce(result):
    signals = _signals_of_type(result, "crm")
    assert any("north central" in s.title.lower() for s in signals)


def test_task_signal_todd_followup(result):
    signals = _signals_of_type(result, "task")
    assert any("todd" in s.title.lower() for s in signals)


def test_all_signals_have_required_fields(result):
    for signal in result.signals:
        assert signal.signal_type
        assert signal.title
        assert signal.impact_level in ("low", "medium", "high")
        assert signal.urgency in ("none", "low", "medium", "high")
        assert signal.status == "new"
