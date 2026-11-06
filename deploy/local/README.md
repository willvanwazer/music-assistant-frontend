# Deploy the frontend beside an existing Music Assistant server

`codex/web-ui-stable` starts at frontend `2.17.297.post1`, the exact version
bundled with Music Assistant Server `2.10.9` (API schema 65). Keep layout work
for that server on this branch. Upstream `main` and `codex/web-ui-layout` require
a newer development server and must not be deployed against schema 65.

This deployment runs only an nginx frontend container. It serves our compiled
UI and forwards API, authentication, artwork and WebSocket requests to the
existing server. Its library, providers and players stay with that server.
The original server URL and Home Assistant panel continue serving the bundled UI.

## Host setup

On a Linux host with Docker Compose, Python 3, rsync and SSH access, create a
dedicated writable directory. Add an `.env` file there (do not commit it):

```dotenv
MA_BACKEND_URL=http://YOUR_MUSIC_ASSISTANT_HOST:8095
MA_BIND_IP=YOUR_NAS_LAN_IP
MA_FRONTEND_PORT=8097
```

Use an explicit LAN address. The default bind address is loopback. This stack
does not configure a public hostname, tunnel or Home Assistant ingress.

## Deploy

From a checkout of `codex/web-ui-stable`, with Node and pnpm available:

```sh
MA_SSH_HOST=YOUR_SSH_HOST \
MA_DEPLOY_DIR=/YOUR/DEPLOYMENT/DIRECTORY \
bash deploy/local/deploy.sh
```

The script installs locked dependencies, type-checks and builds the UI, verifies
the live server's API schema, uploads a versioned build, validates nginx and
switches the served build atomically. Use `--skip-build` only immediately after
a successful build of the current source. Open `http://YOUR_NAS_LAN_IP:8097`
and sign in with the existing Music Assistant account. Browser sessions belong
to each origin, so the new URL needs its own sign-in.

The original UI remains the fallback. The `site/previous` symlink records the
previous custom build. To restore it on the host:

```sh
cd /YOUR/DEPLOYMENT/DIRECTORY
test -L site/previous
ln -sfn "$(readlink site/previous)" site/current.next
mv -Tf site/current.next site/current
```

Hashed assets are retained across deployments so open tabs can still load the
previous build's chunks. Runtime assets and host configuration stay outside git.
Codex cloud can build this branch; deploying from it additionally requires SSH
connectivity to the host. No automatic cloud-to-home deployment is configured.
