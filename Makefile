REGISTRY := ghcr.io/lakaki27
BACKEND_IMAGE := $(REGISTRY)/riptide-backend
FRONTEND_IMAGE := $(REGISTRY)/riptide-frontend
NIXOS_FLAKE_DIR := /home/leo/Codebase/Perso/maelstrom

.PHONY: check check-back check-front lint lint-back lint-front test test-back test-front deploy build-images push-images

lint-back:
	@docker compose exec backend npx biome ci .

lint-front:
	@docker compose exec frontend npx biome ci .

lint:
	$(MAKE) lint-back
	$(MAKE) lint-front

check-front:
	@docker compose exec frontend npm run check

test-back:
	@docker compose exec backend npm test

test-front:
	@docker compose exec frontend npm run test

test:
	$(MAKE) test-front
	$(MAKE) test-back

check:
	$(MAKE) lint
	$(MAKE) check-front
	$(MAKE) test

build-images:
	docker build -f docker/backend/Dockerfile.prod -t $(BACKEND_IMAGE):latest ./backend
	docker build -f docker/frontend/Dockerfile.prod -t $(FRONTEND_IMAGE):latest ./frontend

push-images: build-images
	docker push $(BACKEND_IMAGE):latest
	docker push $(FRONTEND_IMAGE):latest

deploy: push-images
	cd $(NIXOS_FLAKE_DIR) && nix run github:serokell/deploy-rs -- .#maelstrom
