#!/usr/bin/env bash
# Black-box tests for scripts/format-staged.sh (Prettier + ESLint)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FORMATTER="${ROOT_DIR}/scripts/format-staged.sh"
FIXTURE_DIR="${ROOT_DIR}/scripts/.format-staged-fixtures"
pass_count=0
fail_count=0

cleanup() {
  if [[ -d "${FIXTURE_DIR}" ]]; then
    git -C "${ROOT_DIR}" reset HEAD -- "${FIXTURE_DIR}" >/dev/null 2>&1 || true
    rm -rf "${FIXTURE_DIR}"
  fi
}
trap cleanup EXIT

mkdir -p "${FIXTURE_DIR}"

assert_true() {
  local label="$1"
  shift
  if "$@"; then
    pass_count=$((pass_count + 1))
  else
    fail_count=$((fail_count + 1))
    echo "FAIL: ${label}"
  fi
}

is_staged() {
  local rel="$1"
  git -C "${ROOT_DIR}" diff --cached --name-only -- "${rel}" | grep -qx "${rel}"
}

rel_ugly="scripts/.format-staged-fixtures/ugly.ts"
cat >"${ROOT_DIR}/${rel_ugly}" <<'TS'
export const x={a:1,b:2}
TS
git -C "${ROOT_DIR}" add -- "${rel_ugly}"
set +e
out="$("${FORMATTER}" 2>&1)"
status=$?
set -e
assert_true "format-staged exits 0 for prettier target" test "${status}" -eq 0
assert_true "prettier added spacing" grep -q 'a: 1' "${ROOT_DIR}/${rel_ugly}"
assert_true "file still staged" is_staged "${rel_ugly}"
git -C "${ROOT_DIR}" reset HEAD -- "${rel_ugly}" >/dev/null
rm -f "${ROOT_DIR}/${rel_ugly}"

# ESLint error that --fix cannot remove (prefer-const is auto-fixable; use a real error)
# @typescript-eslint recommended includes no-var? Use empty interface with error if set to error - those are warn.
# Use a syntax that eslint flags as error from recommended: duplicate keys? 
# `const a: string = 1` might be type error not eslint.
# Prefer: bare `debugger` is often error in recommended? Actually not in their config.
# js recommended has no-undef for scripts - but TS files use typed parser.
# Easiest reliable error: `eslint-disable` won't help. Use `eval`? 
# typescript-eslint recommended: ban-ts-comment for @ts-ignore? 
# Let's use: empty file with `throw` and reference undefined with no-undef - for TS files globals.browser means browser globals.
# From @eslint/js recommended: no-constant-binary-expression? 
# Simple approach: file with `var unused = 1` is warn only.
# Use `@ts-expect-error` without description - might be error depending on version.
# Or: `const x = x;` circular - no-use-before-define?

rel_err="scripts/.format-staged-fixtures/eslint_error.ts"
cat >"${ROOT_DIR}/${rel_err}" <<'TS'
export function f() {
  try {
    return 1;
  } finally {
    return 2;
  }
}
TS
git -C "${ROOT_DIR}" add -- "${rel_err}"
set +e
out="$("${FORMATTER}" 2>&1)"
status=$?
set -e
assert_true "format-staged fails on remaining eslint error" test "${status}" -ne 0
git -C "${ROOT_DIR}" reset HEAD -- "${rel_err}" >/dev/null
rm -f "${ROOT_DIR}/${rel_err}"

if [[ "${fail_count}" -gt 0 ]]; then
  echo "${fail_count} failed, ${pass_count} passed"
  echo "${out:-}"
  exit 1
fi

echo "All ${pass_count} checks passed"
