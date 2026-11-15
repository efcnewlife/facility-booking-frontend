#!/usr/bin/env bash
# Publish dist/ to the staging Worker (wrangler.staging.jsonc), then smoke-test https://booking-dev.efcnewlife.com.
# Run by the CI staging deployment; the operator uses it for manual staging redeploys of a kept artifact.
# Source maps are uploaded to Sentry first: no upload, no deployment (newlife-core-api ADR 0038/0039).
# public/.assetsignore keeps the maps off the site itself. A failed smoke test is reported, never rolled back
# automatically; roll back with `wrangler rollback` (newlife-infra docs/cloudflare-booking-staging.md).
#
# Usage: deploy-staging.sh <7-character commit> <label>
#   label: main-<12-char SHA> or x.y.z (scripts/release-target.sh); becomes the Worker version tag.
#   Needs SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, plus CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID for wrangler.
#   STAGING_URL=https://booking-dev.efcnewlife.com  SMOKE_TRIES=10  SMOKE_INTERVAL=15 (seconds)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${ROOT_DIR}/dist"
release="${1:-}"
label="${2:-}"
url="${STAGING_URL:-https://booking-dev.efcnewlife.com}"

if [[ -z "${release}" || -z "${label}" ]]; then
  echo "Usage: $0 <7-character commit> <label>" >&2
  exit 1
fi
if [[ ! "${release}" =~ ^[0-9a-f]{7}$ ]]; then
  echo "${release} is not a 7-character commit (staging Sentry release, ADR 0038)" >&2
  exit 1
fi
if ! grep -q "\"release\":\"${release}\"" "${DIST}/release.json" 2>/dev/null; then
  echo "${DIST}/release.json does not describe release ${release}; refusing to deploy another build" >&2
  exit 1
fi
if [[ -z "$(find "${DIST}" -name '*.map' -print -quit)" ]]; then
  echo "${DIST} has no source maps; a staging build must publish its maps to Sentry before deploying" >&2
  exit 1
fi
for name in SENTRY_AUTH_TOKEN SENTRY_ORG SENTRY_PROJECT; do
  if [[ -z "${!name:-}" ]]; then
    echo "${name} is not set; source maps must reach Sentry before the build is deployed" >&2
    exit 1
  fi
done

sentry_release="facility-booking-frontend@${release}"
# Tool chatter goes to stderr: stdout carries only key=value lines for $GITHUB_OUTPUT.
if ! sentry-cli sourcemaps upload --release "${sentry_release}" "${DIST}" >&2; then
  echo "Source-map upload for ${sentry_release} failed; staging still serves the previous build" >&2
  exit 1
fi

deploy_log="$(mktemp)"
trap 'rm -f "${deploy_log}"' EXIT
wrangler deploy --config "${ROOT_DIR}/wrangler.staging.jsonc" --tag "${label}" --message "${sentry_release} (${label})" |
  tee "${deploy_log}" >&2
version_id="$(sed -n 's/^Current Version ID: //p' "${deploy_log}")"
[[ -n "${version_id}" ]] || echo "Deployed, but wrangler printed no Current Version ID; read it from the Dashboard" >&2
echo "version_id=${version_id}"
echo "sentry_release=${sentry_release}"

fetch() { curl --fail --silent --show-error --max-time 10 "$1"; }

# Passes once the site serves this release, a deep link falls back to the app, the entry bundle loads,
# and its source map is not public. Bodies are captured before grep so an early grep exit cannot fail curl.
smoke_once() {
  local body index bundle
  body="$(fetch "${url}/release.json")" || return 1
  grep -q "\"release\":\"${release}\"" <<<"${body}" || return 1
  index="$(fetch "${url}/__smoke/deep/link")" || return 1
  grep -q 'id="root"' <<<"${index}" || return 1
  bundle="$(grep -o 'src="/assets/[^"]*\.js"' <<<"${index}" | head -1 | sed 's/^src="//; s/"$//')"
  [[ -n "${bundle}" ]] || return 1
  fetch "${url}${bundle}" >/dev/null || return 1
  body="$(fetch "${url}${bundle}.map" 2>/dev/null)" || true
  ! grep -q '"mappings"' <<<"${body}"
}

tries="${SMOKE_TRIES:-10}"
for ((i = 1; i <= tries; i++)); do
  if smoke_once; then
    echo "smoke=passed"
    exit 0
  fi
  ((i < tries)) && sleep "${SMOKE_INTERVAL:-15}"
done

echo "smoke=failed"
echo "${url} did not serve ${sentry_release} correctly after ${tries} tries. No automatic rollback." >&2
exit 1
