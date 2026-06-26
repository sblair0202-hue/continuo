from app.schemas.extraction import (
    ExtractedAccount,
    ExtractedActivity,
    ExtractedContact,
    ExtractedReferralPathwayUpdate,
    ExtractedTask,
    ExtractionResult,
)


def extract_field_intelligence(transcript: str) -> ExtractionResult:
    """
    MVP heuristic extraction stub.

    Later, replace this with an LLM call that returns strict JSON matching
    ExtractionResult.
    """
    text = transcript.lower()
    accounts = []
    contacts = []
    activities = []
    tasks = []
    referral_updates = []
    risks = []
    opportunities = []
    wins = []
    open_questions = []

    if "north central" in text:
        account_name = "North Central Physical Therapy"
        accounts.append(
            ExtractedAccount(
                name=account_name,
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
                account_name=account_name,
                role="Primary clinic contact",
                relationship_note="Main contact for North Central PT.",
                relationship_status="active",
                champion_level="supportive",
            )
        )
        activities.append(
            ExtractedActivity(
                account_name=account_name,
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
                account_name=account_name,
                title="Follow up with Todd regarding Judy assessment",
                description="Check whether Judy's UEDX/FMA assessment will be sent over.",
                priority="high",
                task_type="patient_eval",
            )
        )
        tasks.append(
            ExtractedTask(
                account_name=account_name,
                title="Add North Central Physical Therapy to Salesforce",
                description="Create account/contact record for North Central PT in Salesforce.",
                priority="medium",
                task_type="salesforce",
            )
        )
        opportunities.append("North Central has possible candidate patients and rising early momentum.")

    if "iu health" in text or "neuroscience" in text or "robotic" in text:
        account_name = "IU Health Neuroscience & Robotics Center"
        accounts.append(
            ExtractedAccount(
                name=account_name,
                city="Indianapolis",
                state="IN",
                status="treating_patients",
                momentum="stable",
                next_action="Confirm SAPS continuity and identify replacement for Emily if needed.",
            )
        )
        activities.append(
            ExtractedActivity(
                account_name=account_name,
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

    if "emily" in text:
        relationship_status = "transitioning" if "leaving" in text or "mid july" in text or "mid-july" in text else "active"
        contacts.append(
            ExtractedContact(
                name="Emily",
                account_name="IU Health Neuroscience & Robotics Center",
                role="IT / device logistics",
                relationship_note="Helped receive SAPS computer. Leaving mid-July if mentioned in recap.",
                relationship_status=relationship_status,
                champion_level="supportive",
            )
        )

    if "emily" in text and ("leaving" in text or "mid july" in text or "mid-july" in text):
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
        tasks=tasks,
        referral_pathway_updates=referral_updates,
        risks=risks,
        opportunities=opportunities,
        wins=wins,
        open_questions=open_questions,
        possible_phi_warning=possible_phi,
    )
