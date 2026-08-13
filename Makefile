# Milo task runner.
#
# The root of this repository is language-neutral. JavaScript packages are
# driven by npm workspaces, the FastAPI backend by Poetry. Use make targets
# rather than remembering which tool owns which package.
#
# Python targets no-op cleanly until packages/backend has been installed.

SHELL := /bin/bash

BACKEND  := packages/backend
FRONTEND := packages/frontend
LANDING  := packages/landing

.DEFAULT_GOAL := help
.PHONY: help install install-js install-py dev dev-landing dev-frontend dev-backend \
        build lint lint-js lint-py fmt fmt-js fmt-py fmt-check typecheck test test-py clean

help: ## Show available targets
	@echo "Milo — make <target>"; echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

## ---------------------------------------------------------------- install

install: install-js install-py ## Install every package's dependencies

install-js: ## Install JavaScript workspaces
	npm ci

install-py: ## Install the FastAPI backend with Poetry
	@if [ -f "$(BACKEND)/pyproject.toml" ]; then \
		cd $(BACKEND) && poetry install; \
	else echo "skip: $(BACKEND)/pyproject.toml not found"; fi

## -------------------------------------------------------------------- dev

dev: dev-landing ## Run the default dev server (landing)

dev-landing: ## Run the marketing site on :3000
	npm run dev --workspace @milo/landing

dev-frontend: ## Run the product app on :3001
	npm run dev --workspace @milo/frontend

dev-backend: ## Run the FastAPI backend on :8000
	cd $(BACKEND) && poetry run uvicorn app.main:app --reload --port 8000

## ------------------------------------------------------------------ check

build: ## Production build of all JavaScript packages
	npm run build --workspaces --if-present

lint: lint-js lint-py ## Lint everything

lint-js: ## ESLint across JavaScript workspaces
	npm run lint --workspaces --if-present

lint-py: ## Ruff check on the backend
	@if [ -f "$(BACKEND)/pyproject.toml" ]; then \
		cd $(BACKEND) && poetry run ruff check . && poetry run ruff format --check .; \
	else echo "skip: $(BACKEND) not set up"; fi

typecheck: ## TypeScript and mypy
	npm run typecheck --workspaces --if-present
	@if [ -f "$(BACKEND)/pyproject.toml" ]; then \
		cd $(BACKEND) && poetry run mypy src; \
	else echo "skip: $(BACKEND) not set up"; fi

test: test-py ## Run all test suites

test-py: ## pytest on the backend
	@if [ -f "$(BACKEND)/pyproject.toml" ]; then \
		cd $(BACKEND) && { poetry run pytest -q || [ $$? -eq 5 ]; }; \
	else echo "skip: $(BACKEND) not set up"; fi

## ----------------------------------------------------------------- format

fmt: fmt-js fmt-py ## Format everything

fmt-js: ## Prettier on JavaScript packages only
	npm run format

fmt-py: ## Ruff format on the backend
	@if [ -f "$(BACKEND)/pyproject.toml" ]; then \
		cd $(BACKEND) && poetry run ruff format . && poetry run ruff check --fix .; \
	else echo "skip: $(BACKEND) not set up"; fi

fmt-check: ## Verify formatting without writing
	npm run format:check
	@if [ -f "$(BACKEND)/pyproject.toml" ]; then \
		cd $(BACKEND) && poetry run ruff format --check .; \
	else echo "skip: $(BACKEND) not set up"; fi

## ------------------------------------------------------------------ clean

clean: ## Remove build output and caches
	rm -rf packages/*/.next packages/*/out packages/*/dist
	find . -name __pycache__ -type d -prune -exec rm -rf {} + 2>/dev/null || true
	find . -name .pytest_cache -type d -prune -exec rm -rf {} + 2>/dev/null || true
