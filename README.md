# Abdul Rafay Khan — AI Engineer portfolio

Personal portfolio: Next.js (App Router) · TypeScript · Tailwind CSS · GSAP · React Three Fiber · Supabase · LangChain.

Work in progress — built milestone by milestone. See [PLAN.md](PLAN.md) for the architecture, schema and roadmap. The full README (setup with free accounts, photo pipeline, adding a project) lands in the final milestone.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Checks

```bash
npm run lint
npm run typecheck
npm run test        # unit tests (Vitest)
npm run test:e2e    # end-to-end (Playwright; first run: npx playwright install chromium)
```

## Admin dashboard (`/admin`)

Sign-in is by magic link only, and only for `ADMIN_EMAIL`. One-time Supabase setup:

1. **Create the admin user:** Authentication → Users → Add user → your admin email.
   The login form never creates accounts (`shouldCreateUser: false`).
2. **Turn off public sign-ups:** Authentication → Sign In / Providers → turn off
   "Allow new users to sign up".
3. **Allow the redirect:** Authentication → URL Configuration → set the Site URL
   to the live site and add `https://<your-site>/admin/auth/callback` and
   `http://localhost:3000/admin/auth/callback` to the Redirect URLs.
4. **Draft preview** needs `SUPABASE_SERVICE_ROLE_KEY` on the server (Vercel env).

Every admin write is checked three times: the `/admin` route guard
(`proxy.ts`), an admin check inside each Server Action, and Row Level Security
in the database. The full create → publish → visible test writes to the live
database, so it only runs on request:

```bash
E2E_ADMIN=1 npx playwright test admin
```

## Secrets

Copy `.env.example` to `.env.local`. `.env*` files are gitignored — never commit keys.
