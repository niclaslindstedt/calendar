.PHONY: build test lint fmt fmt-check actionlint shellcheck release clean docs website website-preview website-dev install icons check-seo changelog bump native-install native-bundle native-typecheck native-prebuild

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

# --- the native wrapper (native/) -------------------------------------------
#
# A thin Expo/React Native shell that bundles this web app and serves it in a
# WebView, plus Home Screen widgets. It has its OWN dependency tree — `make
# install` at the root does not touch it — so every target here reaches in
# with `--prefix`. Release builds run on EAS and are triggered by dispatching
# .github/workflows/native.yml; see native/RELEASING.md.

native-install:
	npm --prefix native install

# Build the web app and pack it into native/assets/webroot.zip — the copy the
# wrapper serves. Required before any native build; CI does it for you.
native-bundle:
	npm --prefix native run bundle

native-typecheck:
	npm --prefix native run typecheck

# Regenerate native/ios and native/android from app.config.js and the config
# plugins. Both are gitignored build output — this is only for inspecting what
# the plugins produce.
native-prebuild:
	npm --prefix native run prebuild
