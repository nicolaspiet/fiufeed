# Contributing to Fiufeed

## Scope

Contributions are welcome for:

- bug fixes
- accessibility and UX improvements
- test coverage
- documentation
- performance and reliability improvements
- security hardening

Large product or schema changes should be discussed in an issue before implementation.

## Before You Start

1. Fork the repository.
2. Create a branch from `main`.
3. Keep the change focused.
4. If your change affects Supabase schema or RLS, include the required migration.

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Typecheck before opening a PR:

```bash
npx tsc --noEmit
```

If you touch production behavior, also validate:

```bash
npm run build
```

## Environment

Create `.env.local` from `.env.local.example`.

The app requires a working Supabase project with the repository migrations applied.

## Pull Requests

Please keep PRs small and explicit.

A good PR should include:

- what changed
- why it changed
- screenshots or recordings for UI changes
- migration notes, if any
- manual test notes

## SQL and Security Rules

If your change affects:

- RLS
- storage policies
- auth flows
- competition visibility
- private groups

document the behavior clearly in the PR and verify the access model end to end.

## Coding Expectations

- keep the existing product language and visual style
- avoid unrelated refactors in the same PR
- prefer simple, readable changes over clever abstractions
- preserve behavior in private/public scopes unless the change explicitly targets that logic

## License

By submitting a contribution, you agree that it will be licensed under Apache License 2.0.

