# NexusDrop Agent Notes

Read `agent.md` before making changes. It defines the repository's architecture, security constraints, and validation expectations.

## Project Shape

- Backend: Django + Django REST Framework in `backend/`.
- Frontend: React + Vite in `frontend/`.
- Local orchestration: `docker-compose.yml`, `Makefile`, and `run.sh`.

## Required Context

Before implementing backend or business-logic changes, read:

- `README.md`
- `agent.md`
- `backend/core/models.py`
- Relevant serializers, views, tasks, and tests for the affected flow.

## Run Commands

- Full stack: `docker compose up --build`
- Backend tests: `cd backend && pytest`
- Frontend tests: `cd frontend && npm test`
- Frontend build: `cd frontend && npm run build`

## Constraints

- Wallet balance mutations must keep database locking via `select_for_update()`.
- Validate user input through DRF serializers or frontend Zod schemas.
- Keep Django views and Celery workers stateless.
- Do not commit secrets or supplier API keys.
