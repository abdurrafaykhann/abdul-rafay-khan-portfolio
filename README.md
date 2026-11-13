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

## Secrets

Copy `.env.example` to `.env.local`. `.env*` files are gitignored — never commit keys.
