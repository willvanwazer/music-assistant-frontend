#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

: "${MA_SSH_HOST:?Set the SSH destination}"
: "${MA_DEPLOY_DIR:?Set an absolute deployment directory on that host}"
[[ "$MA_SSH_HOST" =~ ^[a-zA-Z0-9@._-]+$ && "$MA_SSH_HOST" != -* ]]
[[ "$MA_DEPLOY_DIR" =~ ^/[a-zA-Z0-9/_-]+$ && "$MA_DEPLOY_DIR" != / ]]

if [[ "${1:-}" != --skip-build ]]; then
    pnpm install --frozen-lockfile
    pnpm build
fi

test -s music_assistant_frontend/index.html
release="$(git rev-parse --short=12 HEAD)-$(shasum -a 256 music_assistant_frontend/index.html | cut -c1-12)"

# The host owns .env, including the backend URL and LAN bind address. Check
# compatibility before uploading or changing the currently served release.
ssh "$MA_SSH_HOST" bash -s -- "$MA_DEPLOY_DIR" <<'REMOTE'
set -euo pipefail
cd "$1"
test -f .env
set -a
source .env
set +a
python3 - <<'PY'
import json
import os
import urllib.request

with urllib.request.urlopen(os.environ["MA_BACKEND_URL"] + "/info", timeout=10) as response:
    info = json.load(response)
if info.get("schema_version") != 65:
    raise SystemExit("This branch targets API schema 65; review compatibility before deploying.")
print("Backend:", info["server_version"], "API schema:", info["schema_version"])
PY
mkdir -p site/releases site/assets
REMOTE

rsync -rt --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r --exclude='*.py' --exclude=py.typed \
    music_assistant_frontend/ "$MA_SSH_HOST:$MA_DEPLOY_DIR/site/releases/$release/"
rsync -rt --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r music_assistant_frontend/assets/ \
    "$MA_SSH_HOST:$MA_DEPLOY_DIR/site/assets/"
rsync -rt --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r deploy/local/compose.yaml deploy/local/nginx.conf.template \
    "$MA_SSH_HOST:$MA_DEPLOY_DIR/"

ssh "$MA_SSH_HOST" bash -s -- "$MA_DEPLOY_DIR" "$release" <<'REMOTE'
set -euo pipefail
cd "$1"
release="$2"
docker compose config --quiet
docker compose run --rm --no-deps -T frontend nginx -t </dev/null
previous="$(readlink site/current || true)"
ln -sfn "releases/$release" site/current.next
mv -Tf site/current.next site/current
if ! docker compose up -d --wait --wait-timeout 60; then
    if [[ -n "$previous" ]]; then
        ln -sfn "$previous" site/current.next
        mv -Tf site/current.next site/current
    fi
    exit 1
fi
if [[ -n "$previous" && "$previous" != "releases/$release" ]]; then
    ln -sfn "$previous" site/previous
fi
printf 'Serving release %s\n' "$release"
docker compose ps
REMOTE
