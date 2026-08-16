.PHONY: build test lint fmt fmt-check actionlint shellcheck release clean docs website website-preview website-dev install icons check-seo changelog bump

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

# A release is cut by dispatching .github/workflows/release.yml — it derives
# the bump from the .changes/unreleased/ fragments, collates them into
# CHANGELOG.md, tags, and deploys. This target is only the local sanity build.
release:
	npm run build

# Local preview of what the release workflow will write to CHANGELOG.md.
# Pass the planned version: `make changelog VERSION=0.2.0`. Consumes the
# fragments in .changes/unreleased/ — run on a scratch branch, or revert
# afterwards if you only wanted a preview.
changelog:
	@test -n "$(VERSION)" || { \
		echo "usage: make changelog VERSION=X.Y.Z"; exit 2; \
	}
	node scripts/release/collate-changelog.mjs $(VERSION)

# Print the semver bump the release workflow will auto-derive from the
# fragments currently in .changes/unreleased/. Read-only — touches nothing.
bump:
	@node scripts/release/compute-bump.mjs

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
	shellcheck .claude/hooks/*.sh

docs:
	@echo "see docs/"

# The app IS the website: pages.yml assembles the deployment slots (`/`,
# `/preview/`, `/branch/`) into one Pages artifact for
# calendar.niclaslindstedt.se. These targets mirror a single slot's build for
# local inspection.
website:
	npm run build

website-preview:
	VITE_BASE=/preview/ npm run build

website-dev:
	npm run dev

check-seo:
	npm run build && npm run check:seo
