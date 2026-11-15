.PHONY: install build run preview check test perf

PERF_PROFILE ?= mobile

install:
	nix develop 'path:.' --command pnpm install --frozen-lockfile

build:
	nix develop 'path:.' --command pnpm build

run:
	nix develop 'path:.' --command pnpm dev

preview: build
	nix develop 'path:.' --command pnpm preview

check:
	nix develop 'path:.' --command pnpm check

test:
	nix develop 'path:.#test' --command pnpm test

perf:
	nix develop 'path:.#test' --command pnpm test:perf $(PERF_PROFILE)
