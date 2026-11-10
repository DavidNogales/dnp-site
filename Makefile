.PHONY: install build run preview check

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
