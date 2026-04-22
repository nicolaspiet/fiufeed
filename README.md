# Fiufeed

Fiufeed is a social app for short whistle audio posts, groups, reposts, and community competitions.

The stack is:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (Auth, Postgres, Storage, RLS)

## Status

The project is active and still evolving. The codebase is open for contributions, but the product and schema may continue to change quickly.

## Preview

### Landing

![Fiufeed landing](https://i.imgur.com/5kT1V9c.png)

### Posting Flow

![Fiufeed posting flow](https://i.imgur.com/WHNU589.gif)

### Feed

![Fiufeed feed](https://i.imgur.com/I6I8EG8.png)

## Features

- Audio-first posts
- Public feed and profile pages
- Public and private groups
- Competitions with scoped visibility and voting
- Bird badges and titles tied to competition wins
- Supabase-backed auth, storage, and row-level security

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase Requirements

Fiufeed depends on Supabase for:

- authentication
- database schema and RLS
- storage buckets and policies

You must apply the SQL migrations in `supabase/migrations/` to a Supabase project before the app will behave correctly.

Important migrations for the current feature set include:

- `0004_group_media_buckets.sql`
- `0005_group_media_policies.sql`
- `0006_competition_entry_visibility.sql`
- `0007_group_member_management.sql`
- `0008_site_admin_public_competitions.sql`
- `0009_reposts_and_feed_actions.sql`
- `0010_fix_feed_own_posts.sql`
- `0011_fix_interaction_rls_and_private_audio.sql`
- `0012_secure_audio_and_competition_integrity.sql`
- `0013_competition_scope_badges_and_feed.sql`
- `0014_public_routes.sql`

If you apply migrations manually in the Supabase SQL editor, keep them in order.

## Supabase Auth Configuration

In Supabase Authentication:

- `Site URL` should match `NEXT_PUBLIC_APP_URL`
- `Redirect URLs` should include:

```text
http://localhost:3000/auth/callback
https://your-production-domain/auth/callback
```

If you use Google OAuth, configure the provider in Supabase and also add the Supabase callback URL in Google Cloud.

## Build and Validation

```bash
npm run build
npm run lint
```

Notes:

- `next build` may fail in some restricted local environments with `spawn EPERM`; validate in CI or Vercel if that happens.
- if lint tooling is broken in your environment, treat that as a separate setup issue and do not assume the app code is invalid.

## Deploy

The app is designed to deploy on Vercel.

Minimum production checklist:

1. Import the repository in Vercel.
2. Add the environment variables from `.env.local.example`.
3. Set `NEXT_PUBLIC_APP_URL` to the production origin.
4. Configure Supabase Auth `Site URL` and `Redirect URLs`.
5. Apply all required Supabase migrations.
6. Run a smoke test:
   - sign in
   - publish a post
   - play audio
   - comment
   - repost
   - create/join a group
   - create/view a competition

## Open Source

This repository is licensed under Apache License 2.0. See [LICENSE](./LICENSE).

By contributing, you agree that your contributions will be licensed under Apache-2.0 as part of this project.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Security

Please read [SECURITY.md](./SECURITY.md) for how to report vulnerabilities.
