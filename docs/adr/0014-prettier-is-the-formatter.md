# Prettier is the formatter

This SPA had no project-owned formatter; ESLint is not a formatter. Prettier is the only frontend formatter for configured file types. Commit-time enforcement uses `.githooks` via `core.hooksPath` (same install story as branch-name `pre-push`), not Husky or lint-staged. Staged script files also run `eslint --fix`; remaining ESLint **errors** fail the commit; warnings do not. `eslint-config-prettier` disables stylistic ESLint rules that conflict with Prettier. Shared Prettier options with sibling Newlife frontends: double quotes, semicolons, `trailingComma: "es5"`, `arrowParens: "always"`, `printWidth: 120`.

## Considered Options

- **Biome** — would duplicate or replace the existing ESLint stack.
- **ESLint `--fix` alone** — incomplete formatting; leaves style to editors.
- **Husky + lint-staged** — conflicts with org `.githooks` convention.

## Consequences

- `pnpm run format` / `pnpm run format:check` (scripts ready when CI is added later).
- Full-tree apply may land in a dedicated follow-up PR when splitting work.
- Clone once: `./scripts/install-git-hooks.sh`. Emergency: `git commit --no-verify`.
