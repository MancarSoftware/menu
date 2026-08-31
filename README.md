# El Bueno

A mobile-first fast-food menu inspired by the supplied Figma model. Customers can browse burgers, pizzas, combos, and drinks; search or filter products; inspect details; build a persistent cart; and send a complete delivery order through WhatsApp. A protected admin area manages the business profile, categories, products, availability, ordering, and images.

## Stack

- Next.js 16, React 19, and TypeScript
- Prisma with PostgreSQL for local and production data
- Zod validation and signed session cookies
- Vitest for unit and integration tests
- Playwright for desktop and mobile end-to-end coverage

## Local setup

```bash
npm install
copy .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Before migrating or seeding, configure `DATABASE_URL`, then replace the example session secret and administrator password in `.env`. The public site runs at `http://127.0.0.1:3000`; the sign-in screen is at `/admin/login`.

Use `npm run db:migrate:deploy` in hosted environments. Keep all database URLs and credentials in local or hosting-platform environment variables; never commit `.env`.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Images

Local development stores uploads in `public/uploads`. Production can use Cloudinary by setting the optional variables in `.env.example`. Optimized WebP assets used by the public experience live in `public/images/fast-food`.

## Commit conventions

Use Conventional Commits. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the format and project-specific examples.
