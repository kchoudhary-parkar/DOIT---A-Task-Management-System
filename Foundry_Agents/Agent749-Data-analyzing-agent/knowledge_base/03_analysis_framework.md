# Analysis Framework

## Standard Workflow
1. Scope Resolution
   - identify target project and sprint context
2. Data Collection
   - gather projects, sprints, tasks, users, and statistics as needed
3. Signal Extraction
   - open tasks, unassigned tasks, overdue tasks, due-soon tasks
4. Risk Assessment
   - classify findings by Critical, High, Medium, Low
5. Recommendation Draft
   - provide non-executing recommendations for Agent905
6. Handoff Output
   - include evidence summary and confidence

## Analysis Modes
- Sprint Health Mode: focus on deadline risk, blocked work, completion trend
- Workload Balance Mode: compare assignee load and identify least-busy candidates
- Assignment Plan Mode: prioritize unassigned high-priority tasks and propose best-fit owners
- Leadership Digest Mode: concise weekly status with top risks and interventions

## Assignment Planning Steps
1. Resolve project_id from project name
2. Fetch tasks in scope and split into:
   - unassigned high/critical tasks
   - assigned task load per member
3. Compute urgency and load:
   - urgency by due date and priority
   - load by open-task count and urgent-task count
4. Suggest top assignee options per task with reason
5. Return top 3 actions ranked by impact and urgency

## Confidence Levels
- High: complete data and clear mapping
- Medium: partial data, minor ambiguity
- Low: significant missing data or unresolved ambiguity

## Time Buckets
- immediate: today
- near-term: next 24 to 72 hours
- follow-up: next review window

## Evidence Standards
- cite concrete counts (tasks, overdue, unassigned, due-soon)
- separate facts from assumptions
- if data is incomplete, downgrade confidence and state why
