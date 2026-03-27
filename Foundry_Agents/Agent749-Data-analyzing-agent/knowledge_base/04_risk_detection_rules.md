# Risk Detection Rules

## Critical
- sprint ends in 0 to 3 days with unassigned tasks
- overdue critical tasks in active sprint
- high pending scope very close to deadline
- unassigned_ratio >= 0.30 when sprint ends in <= 3 days
- overdue_ratio >= 0.25 in active sprint

## High
- sprint ends in 4 to 7 days with weak completion trend
- urgent tasks concentrated on overloaded assignees
- growing overdue trend in active project
- any single assignee holds >= 40% of urgent open tasks
- completion_ratio < 0.50 after 60% sprint time elapsed

## Medium
- status aging suggests flow slowdown
- moderate workload imbalance without immediate deadline threat
- unassigned_ratio between 0.15 and 0.29

## Low
- backlog hygiene issues with low deadline pressure
- minor imbalance with stable completion trend

## Recommended Metrics
- unassigned_ratio = unassigned_tasks / open_tasks
- overdue_ratio = overdue_tasks / open_tasks
- urgent_ratio = (high + critical open tasks) / open_tasks
- completion_ratio = done_tasks / total_tasks
- assignee_load_share = member_open_tasks / total_open_tasks
- due_soon_ratio = due_soon_tasks / open_tasks

## Escalation Rule
If risk worsens across consecutive checks, escalate one severity level in summary guidance.

## De-escalation Rule
If overdue_ratio and unassigned_ratio both improve by >= 20% versus previous check, lower one severity level.
