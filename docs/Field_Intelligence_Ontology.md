# Field Intelligence Ontology

## Purpose

Define the core objects and relationships that make Continuo a Field Intelligence Platform.

## Core Objects

### User

A field professional using Continuo.

### Organization

The company or team the user belongs to.

### Account

A customer, site, clinic, hospital, company, or location where field work happens.

### Contact

A person associated with an account.

### Activity

Any meaningful field interaction or system event.

Examples:
- Site visit
- Lunch and learn
- Meeting
- Email
- Phone call
- Patient discussion
- Referral
- Training
- Conference
- Support group
- Internal planning
- Grand rounds
- Dinner program
- Device support

### Task

An actionable follow-up.

### Voice Journal Entry

A raw or summarized verbal recap from the user.

### Referral Pathway

A structured workflow that describes how a patient, customer, or opportunity moves through a system.

### Relationship Signal

Information about a contact relationship.

Examples:
- Champion identified
- Relationship strengthened
- Contact leaving role
- New stakeholder added
- Decision-maker identified

### Momentum Signal

Evidence that an account is moving forward, stalling, or declining.

Examples:
- Candidate patient identified
- First evaluation scheduled
- Referral pathway confirmed
- Champion leaving
- No activity for 45 days

### Field Intelligence Graph

The connected model of accounts, contacts, activities, tasks, workflows, risks, opportunities, and relationship signals.

## Key Relationships

- Account has many Contacts
- Account has many Activities
- Account has many Tasks
- Account has one or more Referral Pathways
- Contact belongs to one or more Accounts
- Activity may create Tasks, Contact Updates, and Referral Pathway Updates
- Voice Journal Entry may generate Activities
- Tasks may link to Accounts, Contacts, Activities, or Voice Journal Entries

## Example

Voice recap:

"Met with Todd at North Central PT. They have three patients who may be candidates. Judy may be first. Dropped off UEDX kit."

Creates:
- Account: North Central PT
- Contact: Todd
- Activity: Site visit / follow-up
- Task: Follow up with Todd about Judy
- Momentum Signal: Increased
