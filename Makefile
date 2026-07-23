.PHONY: init test

init:
	@docker compose up -d --build

test-back:
	@docker compose exec backend npm test

test-front:
	@docker compose exec web npm run test
	
test:
	$(MAKE) test-back
	$(MAKE) test-front