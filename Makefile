REGISTRY := ghcr.io/lakaki27
BACKEND_IMAGE := $(REGISTRY)/riptide-backend
FRONTEND_IMAGE := $(REGISTRY)/riptide-frontend
NIXOS_FLAKE_DIR := ../maelstrom-config

.PHONY: deploy build-images push-images init test test-back test-front

init:
	@docker compose up -d --build

test-back:
	@docker compose exec backend npm test

test-front:
	@docker compose exec frontend npm run test

test:
	$(MAKE) test-back
	$(MAKE) test-front

build-images:
	docker build -f docker/backend/Dockerfile.prod -t $(BACKEND_IMAGE):latest ./backend
	docker build -f docker/frontend/Dockerfile.prod -t $(FRONTEND_IMAGE):latest ./frontend

push-images: build-images
	docker push $(BACKEND_IMAGE):latest
	docker push $(FRONTEND_IMAGE):latest

deploy: push-images
	cd $(NIXOS_FLAKE_DIR) && nix run github:serokell/deploy-rs -- .#maelstrom
