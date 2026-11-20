.PHONY: all install dev test build help

help:
	@echo "YogSetu Commands:"
	@echo "  make install  - Install backend venv and frontend npm dependencies"
	@echo "  make test     - Run backend pytest test suite"
	@echo "  make build    - Build production frontend bundle"
	@echo "  make dev      - Instructions to run backend and frontend dev servers"

install:
	cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
	cd frontend && npm install

test:
	cd backend && .venv/bin/pytest -v

build:
	cd frontend && npm run build

dev:
	@echo "Starting servers:"
	@echo "Terminal 1 (Backend): cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000"
	@echo "Terminal 2 (Frontend): cd frontend && npm run dev"
