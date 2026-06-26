from app.schemas.extraction import (
    ExtractedAccount,
    ExtractedActivity,
    ExtractedContact,
    ExtractedReferralPathwayUpdate,
    ExtractedSignal,
    ExtractedTask,
    ExtractionResult,
)


def extract_field_intelligence(transcript: str) -> ExtractionResult:
    """
    Heuristic extraction engine. Replace with LLM call returning strict
    JSON matching ExtractionResult once the LLM layer is wired in.
    """
    text = transcript.lower()
    accounts = []
    contacts = []
    activities = []
    signals = []
    tasks = []
    referral_updates = []
    risks = []
    opportunities = []
    wins = []
    open_questions = []

    # ── IU Health / Ryan / Emily block ────────────────────────────────────────

    if "iu health" in text or "neuroscience" in text or "robotic" in text:
        iu_account = "IU Health Neuroscience & Robotics Center"
        accounts.append(
            ExtractedAccount(
                name=iu_account,
                city="Indianapolis",
                state="IN",
                status="treating_patients",
                momentum="stable",
                next_action="Confirm SAPS continuity and identify replacement for Emily if needed.",
            )
        )
        activities.append(
            ExtractedActivity(
                account_name=iu_account,
                activity_type="therapist_training",
                summary="SAPS/device support or therapist orientation at IU Neuroscience & Robotics Center.",
                details=transcript,
                outcome="Therapy readiness strengthened.",
                momentum="stable",
                confidence_score=0.8,
            )
        )

    if "ryan" in text:
        contacts.append(
            ExtractedContact(
                name="Ryan",
                account_name="IU Health Neuroscience & Robotics Center",
                role="Therapy contact",
                relationship_note="Oriented on SAPS computer.",
                relationship_status="active",
                champion_level="emerging",
            )
        )
        wins.append("Ryan oriented on SAPS computer.")
        signals.append(
            ExtractedSignal(
                account_name="IU Health Neuroscience & Robotics Center",
                contact_names=["Ryan"],
                signal_type="implementation",
                title="Ryan completed SAPS orientation",
                summary="Ryan was oriented on the SAPS computer at IU Health Neuroscience & Robotics Center.",
                evidence_text=transcript,
                confidence_score=0.9,
                impact_level="medium",
                urgency="low",
                suggested_action="Confirm Ryan can run SAPS independently.",
            )
        )
        signals.append(
            ExtractedSignal(
                account_name="IU Health Neuroscience & Robotics Center",
                contact_names=["Ryan"],
                signal_type="win",
                title="Ryan trained on SAPS",
                summary="Successful SAPS training completed with Ryan.",
                evidence_text=transcript,
                confidence_score=0.9,
                impact_level="medium",
                urgency="none",
                suggested_action=None,
            )
        )

    emily_leaving = "emily" in text and (
        "leaving" in text or "mid-july" in text or "mid july" in text
    )

    if "emily" in text:
        relationship_status = "transitioning" if emily_leaving else "active"
        contacts.append(
            ExtractedContact(
                name="Emily",
                account_name="IU Health Neuroscience & Robotics Center",
                role="IT / device logistics",
                relationship_note="Helped receive SAPS computer. Leaving mid-July.",
                relationship_status=relationship_status,
                champion_level="supportive",
            )
        )

    if emily_leaving:
        risks.append("Emily is leaving mid-July; replacement contact needs to be identified.")
        tasks.append(
            ExtractedTask(
                account_name="IU Health Neuroscience & Robotics Center",
                title="Identify Emily's replacement before mid-July",
                description="Confirm who will own SAPS/device logistics after Emily leaves.",
                priority="high",
                task_type="follow_up",
            )
        )
        signals.append(
            ExtractedSignal(
                account_name="IU Health Neuroscience & Robotics Center",
                contact_names=["Emily"],
                signal_type="relationship",
                title="Emily leaving mid-July",
                summary="Emily is departing mid-July and no replacement has been identified.",
                evidence_text=transcript,
                confidence_score=0.95,
                impact_level="high",
                urgency="high",
                suggested_action="Identify replacement contact before mid-July.",
            )
        )
        signals.append(
            ExtractedSignal(
                account_name="IU Health Neuroscience & Robotics Center",
                contact_names=["Emily"],
                signal_type="risk",
                title="Emily leaving mid-July with no identified replacement",
                summary="Device logistics and SAPS oversight at IU Health will have a coverage gap when Emily departs.",
                evidence_text=transcript,
                confidence_score=0.95,
                impact_level="high",
                urgency="high",
                suggested_action="Identify and onboard Emily's replacement before mid-July.",
            )
        )

    if "transferred" in text or "transfer" in text:
        signals.append(
            ExtractedSignal(
                account_name="IU Health Neuroscience & Robotics Center",
                contact_names=[],
                signal_type="continuity",
                title="Patient transferred mid-protocol from Ascension Naab Road to IU",
                summary="A patient transferred between therapy sites mid-protocol, requiring continuity coordination.",
                evidence_text=transcript,
                confidence_score=0.9,
                impact_level="high",
                urgency="medium",
                suggested_action="Create a patient transfer playbook to standardize mid-protocol handoffs.",
            )
        )

    # ── North Central PT / Todd / Judy block ──────────────────────────────────

    if "north central" in text:
        nc_account = "North Central Physical Therapy"
        accounts.append(
            ExtractedAccount(
                name=nc_account,
                city="Logansport",
                state="IN",
                status="education_started",
                momentum="rising",
                next_action="Follow up with Todd regarding Judy assessment.",
            )
        )
        contacts.append(
            ExtractedContact(
                name="Todd",
                account_name=nc_account,
                role="Primary clinic contact",
                relationship_note="Main contact for North Central PT.",
                relationship_status="active",
                champion_level="supportive",
            )
        )
        activities.append(
            ExtractedActivity(
                account_name=nc_account,
                activity_type="site_visit",
                summary="North Central PT follow-up after lunch and learn.",
                details=transcript,
                outcome="UEDX kit delivered and potential candidates discussed.",
                momentum="increased",
                next_step="Follow up regarding Judy assessment.",
                confidence_score=0.85,
            )
        )
        tasks.append(
            ExtractedTask(
                account_name=nc_account,
                title="Follow up with Todd regarding Judy assessment",
                description="Check whether Judy's UEDX/FMA assessment will be sent over.",
                priority="high",
                task_type="patient_eval",
            )
        )
        tasks.append(
            ExtractedTask(
                account_name=nc_account,
                title="Add North Central Physical Therapy to Salesforce",
                description="Create account and contact record for North Central PT in Salesforce.",
                priority="medium",
                task_type="salesforce",
            )
        )
        opportunities.append("North Central has possible candidate patients and rising early momentum.")

    if "uedx" in text and ("delivered" in text or "kit" in text):
        signals.append(
            ExtractedSignal(
                account_name="North Central Physical Therapy",
                contact_names=[],
                signal_type="milestone",
                title="UEDX kit delivered to North Central Physical Therapy",
                summary="UEDX kit was delivered, marking the start of the clinical trial readiness phase.",
                evidence_text=transcript,
                confidence_score=0.95,
                impact_level="medium",
                urgency="low",
                suggested_action="Follow up after therapists review the UEDX resources.",
            )
        )

    if ("three" in text or "3" in text) and "patient" in text or "judy" in text:
        signals.append(
            ExtractedSignal(
                account_name="North Central Physical Therapy",
                contact_names=["Todd", "Judy"],
                signal_type="opportunity",
                title="Three potential stroke patients identified, Judy as likely first evaluation",
                summary="North Central PT has three possible stroke patient candidates. Judy is the likely first evaluation.",
                evidence_text=transcript,
                confidence_score=0.9,
                impact_level="high",
                urgency="medium",
                suggested_action="Follow up with Todd on Judy as the likely first evaluation candidate.",
            )
        )

    if "salesforce" in text and "north central" in text:
        signals.append(
            ExtractedSignal(
                account_name="North Central Physical Therapy",
                contact_names=[],
                signal_type="crm",
                title="Add North Central Physical Therapy to Salesforce",
                summary="North Central PT does not yet have a Salesforce account record.",
                evidence_text=transcript,
                confidence_score=0.95,
                impact_level="medium",
                urgency="medium",
                suggested_action="Create Salesforce account and contact records for North Central PT.",
            )
        )

    if "follow up" in text and "todd" in text:
        signals.append(
            ExtractedSignal(
                account_name="North Central Physical Therapy",
                contact_names=["Todd"],
                signal_type="task",
                title="Follow up with Todd next week regarding Judy assessment",
                summary="Field rep needs to follow up with Todd at North Central PT next week.",
                evidence_text=transcript,
                confidence_score=0.95,
                impact_level="high",
                urgency="high",
                suggested_action="Create a follow-up task due next week.",
            )
        )

    # ── Generic referral / PHI handling ───────────────────────────────────────

    if "referral" in text or "fax" in text:
        referral_updates.append(
            ExtractedReferralPathwayUpdate(
                account_name=None,
                update_type="possible_referral_pathway_update",
                detail="Transcript mentions referral or fax information. Review for pathway update.",
            )
        )

    possible_phi = any(
        token in text
        for token in ["dob", "date of birth", "mrn", "medical record", "social security"]
    )

    if not accounts:
        open_questions.append("Which account/site should this recap be linked to?")

    return ExtractionResult(
        summary="AI-extracted field recap. Review before saving.",
        accounts=accounts,
        contacts=contacts,
        activities=activities,
        signals=signals,
        tasks=tasks,
        referral_pathway_updates=referral_updates,
        risks=risks,
        opportunities=opportunities,
        wins=wins,
        open_questions=open_questions,
        possible_phi_warning=possible_phi,
    )
