# SakhiLine

Voice-assisted visit documentation for ASHA workers, currently a **planning-only repository**. The intended demonstration uses invented beneficiaries and observations. No application, database, authentication, speech integration or measured accuracy exists yet.

Source: the nine-page project brief supplied by the user, extracted in [brief](docs/source/brief-extracted.txt). The existing [previous review](SakhiLine-review-conclusions.md) is retained unchanged and is not proof of three-member approval.

## Read in order

1. [Council report: audit through next task](docs/council/COUNCIL_REPORT.md).
2. [Repository facts and unknowns](PROJECT_CONTEXT.md).
3. [Decision log and actual individual votes](DECISION_LOG.md).
4. [PRD](PRD.md), [design](DESIGN.md), [architecture](ARCHITECTURE.md).
5. [Roadmap with human gates](IMPLEMENTATION_ROADMAP.md).

## Recommended direction, subject to votes and human approval

One language and one online recording-to-confirmation-to-supervisor-review loop, with a small deterministic synthetic evaluation. Durable offline audio, calls, automated reminders, clinical flags, GPU hosting and continuous live filling are deferred recommendations. These change parts of the brief and require human agreement. No diagnosis, treatment or emergency-response behavior is planned.

## Engineering references

[Backend](BACKEND_CONTEXT.md) · [Data](DATABASE.md) · [API](API.md) · [Security](AUTHENTICATION_AND_SECURITY.md) · [Integrations](INTEGRATIONS.md) · [Setup](SETUP_AND_INITIALIZATION.md) · [Feature workflow](FEATURE_DEVELOPMENT.md) · [MCP](MCP_CONNECTION.md) · [QA](TESTING_AND_QA.md) · [Debugging](DEBUGGING.md) · [Agent rules](AGENTS.md).

There is no install/start command yet. The commands in the roadmap are proposed acceptance commands for future implementation. Do not infer a working product from documentation. No production code or new routes were created by this council.
