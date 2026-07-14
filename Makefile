setup-gh-pages: ## Create GitHub repo and enable Pages deployment via Actions
	@scripts/setup-gh-pages.sh

# These make tasks allow the default help text to work properly.
%:
	@true

.PHONY: help setup-gh-pages

help:
	@echo 'Usage: make <command>'
	@echo
	@echo 'where <command> is one of the following:'
	@echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
