#!/usr/bin/env bash
# Black-box tests for scripts/deploy-staging.sh with fake sentry-cli, wrangler, and curl on PATH.
# Runs against a throwaway copy of the repository layout; never contacts Sentry or Cloudflare.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

REPO="${WORK}/repo"
mkdir -p "${REPO}/scripts" "${WORK}/bin"
cp "${ROOT_DIR}/scripts/deploy-staging.sh" "${REPO}/scripts/"
cp "${ROOT_DIR}/wrangler.staging.jsonc" "${REPO}/"
DEPLOY="${REPO}/scripts/deploy-staging.sh"

RELEASE=abc1234
VERSION_ID=11111111-2222-3333-4444-555555555555

pass_count=0
fail_count=0

# FAKE_SENTRY_FAIL=1: the source-map upload fails. FAKE_WRANGLER_FAIL=1: the deployment fails.
cat >"${WORK}/bin/sentry-cli" <<'EOF'
#!/usr/bin/env bash
echo "sentry-cli $*" >>"$FAKE_LOG"
echo "> Found 2 files"
[[ -z "${FAKE_SENTRY_FAIL:-}" ]]
EOF
cat >"${WORK}/bin/wrangler" <<'EOF'
#!/usr/bin/env bash
echo "wrangler $*" >>"$FAKE_LOG"
[[ -z "${FAKE_WRANGLER_FAIL:-}" ]] || exit 1
echo "Uploaded facility-booking-frontend-stg"
echo "Current Version ID: ${FAKE_VERSION_ID}"
EOF
# The fake site serves files from $FAKE_SITE and answers anything else with index.html, like SPA fallback.
cat >"${WORK}/bin/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl $*" >>"$FAKE_LOG"
url="${*: -1}"
path="${url#https://booking-dev.efcnewlife.com}"
if [[ -f "${FAKE_SITE}${path}" && "${path}" != "/" ]]; then
  cat "${FAKE_SITE}${path}"
else
  cat "${FAKE_SITE}/index.html"
fi
EOF
chmod +x "${WORK}/bin/"*

# A built dist/ for RELEASE, and the site as Cloudflare serves it after a deployment (no .map files).
make_dist() {
  rm -rf "${REPO}/dist" "${WORK}/site"
  mkdir -p "${REPO}/dist/assets" "${WORK}/site/assets"
  for dir in "${REPO}/dist" "${WORK}/site"; do
    echo '<!doctype html><div id="root"></div><script type="module" src="/assets/index-AbC123.js"></script>' \
      >"${dir}/index.html"
    echo 'console.log("booking")' >"${dir}/assets/index-AbC123.js"
    printf '{"repository":"facility-booking-frontend","release":"%s"}\n' "${RELEASE}" >"${dir}/release.json"
  done
  echo '{"version":3,"mappings":"AAAA"}' >"${REPO}/dist/assets/index-AbC123.js.map"
}

run_deploy() {
  export FAKE_LOG="${WORK}/calls.log" FAKE_SITE="${WORK}/site" FAKE_VERSION_ID="${VERSION_ID}"
  : >"${FAKE_LOG}"
  set +e
  stdout="$(PATH="${WORK}/bin:${PATH}" SMOKE_TRIES=2 SMOKE_INTERVAL=0 \
    SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN-test-token}" SENTRY_ORG=efcnewlife SENTRY_PROJECT=facility-booking-frontend \
    "${DEPLOY}" "$@" 2>"${WORK}/stderr")"
  actual_exit=$?
  set -e
  output="${stdout}"$'\n'"$(cat "${WORK}/stderr")"
  calls="$(cat "${FAKE_LOG}")"
}

check() {
  local label="$1"
  shift
  if "$@"; then
    pass_count=$((pass_count + 1))
  else
    fail_count=$((fail_count + 1))
    echo "FAIL: ${label}"
    echo "  exit ${actual_exit}, output: ${output}"
    echo "  calls: ${calls}"
  fi
}

uploads_then_deploys() {
  [[ "${calls}" == *"sentry-cli sourcemaps upload --release facility-booking-frontend@${RELEASE} ${REPO}/dist"* ]] &&
    [[ "$(grep -n '^sentry-cli' <<<"${calls}" | head -1 | cut -d: -f1)" -lt \
      "$(grep -n '^wrangler' <<<"${calls}" | head -1 | cut -d: -f1)" ]]
}

# Happy path.
make_dist
run_deploy "${RELEASE}" main-abc1234def0
check "deploys after the source-map upload" [ "${actual_exit}" -eq 0 ]
check "uploads maps under the repository-qualified release before deploying" uploads_then_deploys
check "deploys the staging config with the label as tag" \
  grep -q "^wrangler deploy --config ${REPO}/wrangler.staging.jsonc --tag main-abc1234def0 --message " <<<"${calls}"
check "reports the new Worker version" grep -qx "version_id=${VERSION_ID}" <<<"${output}"
check "reports the Sentry release" grep -qx "sentry_release=facility-booking-frontend@${RELEASE}" <<<"${output}"
check "reports a passing smoke" grep -qx "smoke=passed" <<<"${output}"
# CI appends stdout to $GITHUB_OUTPUT, which rejects anything but key=value lines.
check "prints only key=value lines on stdout" bash -c '! grep -vE "^[a-z_]+=" <<<"$1"' _ "${stdout}"
check "smoke loads a deep link through SPA fallback" grep -q "curl .*/__smoke/deep/link" <<<"${calls}"
check "smoke loads the entry bundle" grep -q "curl .*/assets/index-AbC123.js$" <<<"${calls}"

# Source-map gate.
make_dist
FAKE_SENTRY_FAIL=1 run_deploy "${RELEASE}" main-abc1234def0
check "failed source-map upload fails the run" [ "${actual_exit}" -ne 0 ]
check "failed source-map upload never deploys" bash -c '! grep -q "^wrangler" <<<"$1"' _ "${calls}"

make_dist
SENTRY_AUTH_TOKEN="" run_deploy "${RELEASE}" main-abc1234def0
check "missing Sentry token fails before any upload" [ "${actual_exit}" -ne 0 ]
check "missing Sentry token calls nothing" [ -z "${calls}" ]

make_dist
rm "${REPO}/dist/assets/index-AbC123.js.map"
run_deploy "${RELEASE}" main-abc1234def0
check "build without source maps is refused" [ "${actual_exit}" -ne 0 ]
check "build without source maps calls nothing" [ -z "${calls}" ]

make_dist
run_deploy 9999999 main-abc1234def0
check "build of another release is refused" [ "${actual_exit}" -ne 0 ]
check "build of another release calls nothing" [ -z "${calls}" ]

# Deployment and smoke failures: reported, never rolled back.
make_dist
FAKE_WRANGLER_FAIL=1 run_deploy "${RELEASE}" main-abc1234def0
check "failed deployment fails the run" [ "${actual_exit}" -ne 0 ]
check "failed deployment skips the smoke" bash -c '! grep -q "^curl" <<<"$1"' _ "${calls}"

make_dist
printf '{"repository":"facility-booking-frontend","release":"%s"}\n' 0000000 >"${WORK}/site/release.json"
run_deploy "${RELEASE}" main-abc1234def0
check "site still on the previous release fails the smoke" [ "${actual_exit}" -ne 0 ]
check "stale site reports a failed smoke" grep -qx "smoke=failed" <<<"${output}"
check "smoke failure is not rolled back" bash -c '! grep -q "rollback" <<<"$1"' _ "${calls}"

make_dist
cp "${REPO}/dist/assets/index-AbC123.js.map" "${WORK}/site/assets/"
run_deploy "${RELEASE}" main-abc1234def0
check "publicly served source map fails the smoke" [ "${actual_exit}" -ne 0 ]

# Arguments.
make_dist
run_deploy abc12 main-abc1234def0
check "short release is refused" [ "${actual_exit}" -ne 0 ]
run_deploy "${RELEASE}"
check "missing label is refused" [ "${actual_exit}" -ne 0 ]
check "missing label prints usage" grep -q "Usage:" <<<"${output}"

if [[ "${fail_count}" -gt 0 ]]; then
  echo "${fail_count} failed, ${pass_count} passed"
  exit 1
fi

echo "All ${pass_count} checks passed"
