#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# generate_scripts.sh
#
# Scaffolds:
#   - shell/publish_frontend.sh
#   - shell/publish_devcontainer.sh
#   - Makefile
#
# Usage:
#   chmod +x generate_scripts.sh
#   ./generate_scripts.sh
# ─────────────────────────────────────────────────────────────────────────────

# Create shell directory
mkdir -p shell

# ─────────────────────────────────────────────────────────────────────────────
# publish_frontend.sh
# ─────────────────────────────────────────────────────────────────────────────
cat > shell/publish_frontend.sh <<'EOF'
#!/usr/bin/env bash
#
# Builds & pushes SymptomSync frontend to GHCR
#
set -euo pipefail

# Image name + tag
IMAGE="ghcr.io/hoangsonww/symptomsync-frontend:0.1.0"

# Ensure credentials
: "${GITHUB_ACTOR:?Please export GITHUB_ACTOR=<your GitHub username>}"
: "${GH_TOKEN:?Please export GH_TOKEN=<your PAT>}"

# Compute build timestamp
BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "🔨 Building $IMAGE"
docker build \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --label org.opencontainers.image.source="https://github.com/comp426-25s/final-project-team-16" \
  -t "$IMAGE" web/

echo "🔐 Logging in to GHCR as $GITHUB_ACTOR"
echo "$GH_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin

echo "📤 Pushing $IMAGE"
docker push "$IMAGE"

echo "✅ Done. Pull via: docker pull $IMAGE"
EOF

chmod +x shell/publish_frontend.sh

# ─────────────────────────────────────────────────────────────────────────────
# publish_devcontainer.sh
# ─────────────────────────────────────────────────────────────────────────────
cat > shell/publish_devcontainer.sh <<'EOF'
#!/usr/bin/env bash
#
# Builds & pushes your .devcontainer image to GHCR
#
set -euo pipefail

IMAGE="ghcr.io/hoangsonww/devcontainer-setup:latest"

: "${GITHUB_ACTOR:?Please export GITHUB_ACTOR=<your GitHub username>}"
: "${GH_TOKEN:?Please export GH_TOKEN=<your PAT>}"

echo "🔨 Building $IMAGE from .devcontainer/"
docker build \
  --label org.opencontainers.image.title="devcontainer-setup" \
  --label org.opencontainers.image.description="Devcontainer with Node.js, Supabase CLI, zsh, etc." \
  -t "$IMAGE" .devcontainer/

echo "🔐 Logging in to GHCR as $GITHUB_ACTOR"
echo "$GH_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin

echo "📤 Pushing $IMAGE"
docker push "$IMAGE"

echo "✅ Done. Pull via: docker pull $IMAGE"
EOF

chmod +x shell/publish_devcontainer.sh

# ─────────────────────────────────────────────────────────────────────────────
# Makefile
# ─────────────────────────────────────────────────────────────────────────────
cat > Makefile <<'EOF'
# ────────────────────────────────────────────────────────────────────────────#
# Makefile for SymptomSync
#
# Usage:
#   make            # builds frontend & devcontainer
#   make build      # same as all
#   make publish    # publish frontend & devcontainer
#   make lint       # lints code
#   make format     # formats code
#   make clean      # remove .next and node_modules
# ────────────────────────────────────────────────────────────────────────────#

SHELL := /usr/bin/env bash

.PHONY: all build publish lint format clean

all: build

# Build both images
build:
	@echo "👉 Building frontend..."
	cd web && npm install --legacy-peer-deps && npm run build && cd ..
	@echo "👉 Building devcontainer..."
	@./shell/publish_devcontainer.sh --dry-run

# Publish both to GHCR
publish: 
	@echo "👉 Publishing frontend..."
	@./shell/publish_frontend.sh
	@echo "👉 Publishing devcontainer..."
	@./shell/publish_devcontainer.sh

# Lint & format (frontend)
lint:
	@echo "👉 Running ESLint..."
	cd web && npm run lint && cd ..

format:
	@echo "👉 Running Prettier..."
	cd web && npm run format && cd ..

clean:
	@echo "👉 Cleaning build artifacts..."
	rm -rf web/.next
	find web -name node_modules | xargs rm -rf || true
EOF

echo "✅ Scaffolding complete!"
echo "- shell/publish_frontend.sh"
echo "- shell/publish_devcontainer.sh"
echo "- Makefile"
echo
echo "Next steps:"
echo "  1) Edit GH_TOKEN & GITHUB_ACTOR exports in your shell."
echo "  2) Build everything:    make"
echo "  3) Publish to GHCR:   make publish"
echo "  4) Lint & format:      make lint format"
echo "  5) Clean:              make clean"