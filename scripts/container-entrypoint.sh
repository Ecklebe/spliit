#!/bin/bash

set -euxo pipefail

# Docker-secrets-style indirection: for any FOO_FILE=/path env var, export
# FOO from that file's contents (unless FOO is already set). env.ts reads
# plain env vars with no awareness of Docker secrets, so this is what lets
# compose.yml hand OIDC_PROVIDER_*_CLIENT_SECRET/AUTH_SECRET to the
# container as mounted secrets rather than as plaintext `environment:`
# entries. Written in POSIX sh, not bash indirect-expansion syntax
# (${!name}), since this container's ENTRYPOINT is ["/bin/sh", ...] -
# invoking the script via its path runs it under /bin/sh regardless of
# this file's own bash shebang, and busybox ash doesn't support ${!name}.
for entry in $(env | grep '_FILE=' | cut -d= -f1); do
  base="${entry%_FILE}"
  eval "current=\${$base:-}"
  eval "file=\$$entry"
  if [ -z "$current" ] && [ -f "$file" ]; then
    eval "export $base=\"\$(cat \"$file\")\""
  fi
done

# Invoke the Prisma CLI by path: the standalone image has no package.json
# scripts and no .bin on PATH, so `npx prisma` would try to fetch it.
node node_modules/prisma/build/index.js migrate deploy

# The standalone build's own server entry point, in place of `next start`.
exec node server.js
