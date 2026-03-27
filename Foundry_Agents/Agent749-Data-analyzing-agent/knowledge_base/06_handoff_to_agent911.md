# Handoff to Agent905

Note: filename retained for compatibility; contract now targets Agent905.

## Contract
This agent returns analysis-only outputs to Agent905.
Agent905 decides whether to request user confirmation and trigger automation via its own tooling path.

## Required Handoff Fields
- analysis_id
- scope
- severity_summary
- top_findings
- recommended_actions_non_executing
- top_3_actions
- confidence
- data_gaps

## Behavior Rules
- never instruct direct write execution as completed
- phrase recommendations as proposals
- include assumptions and unresolved ambiguities

## Example Handoff
- analysis_id: ro-2026-03-20-001
- scope: SprintA in Project DOIT
- severity_summary: Critical
- top_findings: 3 unassigned tasks, 2 overdue high tasks, D-3 timeline
- recommended_actions_non_executing: assign, reprioritize, rebalance
- top_3_actions: assign ticket AA-012, rebalance urgent tasks, resolve blocker on AA-004
- confidence: High
- data_gaps: none
