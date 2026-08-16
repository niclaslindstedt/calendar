.PHONY: build test lint fmt fmt-check actionlint shellcheck release clean docs website website-dev install icons check-seo

build:
	npm run build

test:
	npm test

lint:
	npm run lint

fmt:
	npm run fmt

fmt-check:
	npm run fmt:check

release:
	npm run build

clean:
	rm -rf dist node_modules

install:
	npm install

# Regenerate the PWA install icons + the Open Graph image from the app mark.
icons:
	npm run icons

actionlint:
	actionlint -color

shellcheck:
	shellcheck scripts/*.sh .claude/hooks/*.sh

docs:
	@echo "see docs/"

# The app IS the website: pages.yml builds it with the Pages base path and
# deploys dist/. These targets mirror that for local inspection.
website:
	VITE_BASE=/calendar/ npm run build

website-dev:
	npm run dev

check-seo:
	npm run build && npm run check:seo
