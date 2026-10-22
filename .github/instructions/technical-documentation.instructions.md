---
name: Technical Documentation Maintenance
description: 'Use for repository-wide feature work, architecture changes, module responsibility changes, data-flow changes, major technical decisions, and documentation updates in CharAIcter.'
applyTo: '**'
---

# Technical Documentation Maintenance

Maintain one canonical technical overview at `docs/TECHNICAL-OVERVIEW.md`. Keep it concise and approximately five pages when complete. Do not create or rewrite it unless the task requires it.

Before updating documentation:

- Inspect the current implementation, relevant tests, configuration, and existing documentation.
- Describe only behavior, architecture, decisions, challenges, and trade-offs supported by the code or an explicitly agreed requirement.
- Clearly separate implemented behavior from planned or deferred work.

Update the canonical overview in the same task, whenever practical, when a change affects:

- system architecture, runtime boundaries, deployment, or major data flow;
- module responsibilities or the relationship between the React web app, analyzer, API, and shared contracts;
- a major user-facing feature or workflow;
- an important technical decision, dependency, privacy rule, performance strategy, or security boundary;
- a substantial challenge and the implemented solution or trade-off.

An update is normally not required for isolated styling, copy, formatting, refactoring that preserves responsibilities, test-only changes, dependency patches without architectural impact, or small bug fixes that do not change documented behavior. Use judgment: if a future maintainer would need to understand the change to understand the system, document it.

When documentation is required:

1. Identify the affected section before editing.
2. Preserve accurate existing content and update only affected sections; do not regenerate the document wholesale.
3. Keep these sections coherent: project overview, system architecture, process per module, and challenges, solutions, and design trade-offs.
4. Record current implementation first; label planned work explicitly and never present it as implemented.
5. Keep examples, commands, paths, and data-flow descriptions aligned with the repository.
6. Review the diff for unsupported claims, stale statements, unnecessary repetition, and unrelated edits.

Keep `docs/TECHNICAL-OVERVIEW.md` independent from `README.md` and other contributor-facing documents. Do not link to, extend, or duplicate the technical overview through those documents; maintain the overview as its own canonical technical record.
