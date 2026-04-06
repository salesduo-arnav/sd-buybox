.PHONY: dev build up down logs migrate test clean

# Development
dev-db:
	docker-compose up --build -d postgres

dev:
	docker-compose up --build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

# Backend
backend-dev:
	cd backend && npm run dev

backend-build:
	cd backend && npm run build

# Database
migrate:
	cd backend && npm run migrate:up

migrate-down:
	cd backend && npm run migrate:down

migrate-create:
	cd backend && npm run migrate:create -- $(name)

# Testing
test:
	cd backend && npm test

test-watch:
	cd backend && npm run test:watch

# Frontend
frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

# Clean
clean:
	docker-compose down -v
	cd backend && npm run clean
	cd frontend && rm -rf node_modules dist

# Install
install:
	cd backend && npm install
	cd frontend && npm install
