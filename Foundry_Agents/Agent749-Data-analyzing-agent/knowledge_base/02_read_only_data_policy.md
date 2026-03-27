# Read-Only Data Policy

## Hard Rule
Only use read operations from the read-only OpenAPI tool.

## Allowed Endpoints
- getAllProjects
- getAllTasks
- getAllUsers
- getSprints
- getStatistics
- getTaskDetails
- getProjectDetails
- healthCheck

## Forbidden Behavior
- do not call or suggest calling write endpoints directly
- do not fabricate operation results
- do not infer missing IDs as if confirmed
- do not claim assignments/updates are completed
- do not expose full raw datasets when summary is sufficient

## Data Hygiene Rules
- map project names to project_id via getAllProjects
- mark uncertain findings with lower confidence
- report missing or stale data explicitly
- verify sprint status case-insensitively before concluding "no active sprint"
- normalize status/priority labels before metrics calculations

## Analysis Depth Rules
- prefer focused scope (project/sprint/team) before broad scans
- compute load and urgency before recommending assignees
- return top 3 highest-impact actions first

## Privacy Rule
Return only necessary data in summaries.
Avoid exposing unnecessary personal details.
