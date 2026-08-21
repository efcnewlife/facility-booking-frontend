#!/usr/bin/env bash
# Format staged files with Prettier, ESLint --fix on scripts, then re-stage.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

prettier_files=()
eslint_files=()
while IFS= read -r path; do
  [[ -z "${path}" || ! -f "${path}" ]] && continue
  case "${path}" in
    *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md|*.yml|*.yaml|*.html)
      prettier_files+=("${path}")
      ;;
  esac
  case "${path}" in
    *.ts|*.tsx|*.js|*.jsx)
      eslint_files+=("${path}")
      ;;
  esac
done < <(git diff --cached --name-only --diff-filter=ACMR)

if [[ "${#prettier_files[@]}" -eq 0 && "${#eslint_files[@]}" -eq 0 ]]; then
  exit 0
fi

if [[ "${#prettier_files[@]}" -gt 0 ]]; then
  PRETTIER="${ROOT_DIR}/node_modules/.bin/prettier"
  if [[ ! -x "${PRETTIER}" ]]; then
    echo "prettier not found at ${PRETTIER}; run pnpm install" >&2
    exit 1
  fi
  "${PRETTIER}" --write -- "${prettier_files[@]}"
  git add -- "${prettier_files[@]}"
fi

if [[ "${#eslint_files[@]}" -gt 0 ]]; then
  ESLINT="${ROOT_DIR}/node_modules/.bin/eslint"
  if [[ ! -x "${ESLINT}" ]]; then
    echo "eslint not found at ${ESLINT}; run pnpm install" >&2
    exit 1
  fi
  "${ESLINT}" --fix -- "${eslint_files[@]}"
  git add -- "${eslint_files[@]}"
fi
