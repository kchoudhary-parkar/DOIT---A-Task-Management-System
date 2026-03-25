# Agent Automation: Data Viz & Document Intelligence Integration
Updated: `backend-2/routers/agent_automation_router.py`

## Information Gathered
- Current: Task creation, sprint management, code reviews (agent-token auth)
- Target: Add Data Viz (`data_viz_controller`) + Document Intelligence APIs for agents
- Controllers exist, need agent-friendly wrappers (`verify_agent_token`)

## Plan
**File**: `DOIT---A-Task-Management-System/backend-2/routers/agent_automation_router.py`
1. Import `data_viz_controller.DataVizController`, `document_intelligence`
2. Add Pydantic models: `DocumentAnalyzeRequest`, `DatasetUploadRequest`, `VizConfigRequest`
3. Add endpoints:
   - POST `/agent/automation/document-analyze` → `analyze_document_from_file/url`
   - POST `/agent/automation/dataset-upload` → `upload_file`
   - POST `/agent/automation/visualize` → `generate_visualization`
   - POST `/agent/automation/export-pdf` → `generate_pdf_report`
4. Use existing `_unwrap_controller_response()` pattern

## Dependent Files
- None (proxy existing controllers)

## Followup Steps
1. `uvicorn backend-2.main:app --reload`
2. Test: `curl -H "Authorization: Bearer <agent_token>" -F "file=@test.pdf" http://localhost:8000/api/agent/automation/document-analyze`
3. Update `frontend/src/services/agentAPI.js` if needed

## Progress [1/6]
- [x] Create TODO.md
- [ ] 2. Add imports + models
- [ ] 3. Document analyze endpoint
- [ ] 4. Dataset endpoints
- [ ] 5. Visualization endpoint
- [ ] 6. PDF export + test


