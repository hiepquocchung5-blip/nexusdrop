.PHONY: bootstrap up down backend-test frontend-test

bootstrap:
	cp -n backend/.env.example backend/.env || true
	cp -n frontend/.env.example frontend/.env || true

up: bootstrap
	docker compose up --build

down:
	docker compose down

backend-test:
	cd backend && pytest

frontend-test:
	cd frontend && npm test

