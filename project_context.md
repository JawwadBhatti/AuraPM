# AI PM Suite - Project Context & State

**DO NOT DELETE THIS FILE.** 
This is a state-saving document designed to instantly bring Antigravity (or any AI) up to speed on the current project status if the conversation is restarted or the AI's account ID is changed.

## Technology Stack
- **Backend**: FastAPI (Python), SQLAlchemy, SQLite (`pm_suite.db`).
- **Frontend**: Next.js (TypeScript), Tailwind CSS, Lucide React icons.
- **AI Engine**: `openai` (GPT-4o-mini) parsing PDFs via `pdfplumber`.
- **Integrations**: Two-way Google Sheets Sync via Apps Script and Webhooks.

## System Architecture & Features
We have built an "AI Project Governance Suite" focusing on transparency, tracking, and nudges.
1. **AI Parsing (ai_engine.py):** AI reads PDF proposals, generates JSON containing `Tasks`, `Durations`, and explicit `Finish-to-Start Dependencies (pre_requisites)`.
2. **Reverse Sync:** App pulls and pushes data to a deployed Google Sheet using `MASTER_WEBHOOK_URL` natively tracking 14 specific columns (including Delay Starts, Status, Remarks, and Pre-requisites).
3. **Database (models.py):**
   - User (Admin & Manager roles)
   - Project
   - Task (`task_id_string`, `duration`, `delay_starts`, `bottleneck_person`, `pre_requisites`, etc.)
   - ActivityLog & Notification (Auto Nudges).
4. **Accountability Engine:** AI parses sheet "Remarks" to isolate `bottleneck_person`, displays them in a "Wall of Shame" UI (`/pending`), and triggers push notifications.
5. **Gantt Chart UI:** Custom Tailwind timeline (`GanttChart.tsx`) displaying bars, durations, delay alerts, and `Requires: [Task Name]` badges for dependencies.

## Current Progress
**Status**: `Phase 10: Automated Dependency Engine` is **100% COMPLETE**.
Everything is fully operational. Server runs via `start_servers.bat` and `clean_restart.bat`.

## Immediate Next Step (For the AI reading this)
**Phase 11: Client-Facing Mobile Portal (Magic URL)**
The user's next intended goal is to build a mobile-friendly read-only view ("Progress Portal") where stakeholders or clients can view their specific project timeline (perhaps via an encrypted magic URL parameter bypassing standard login) without altering the data.
