# Brasa Norte

A mobile-first digital menu and lightweight content manager for a contemporary Ecuadorian restaurant. The public experience prioritizes fast discovery, clear dietary information, accessible dish details, and direct WhatsApp contact. The protected admin area manages restaurant information, categories, dishes, availability, ordering, and images.

## Stack

- Next.js 16, React 19, and TypeScript
- Prisma with SQLite for local development
- Zod validation and signed session cookies
- Vitest for unit/integration tests
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

Before seeding, replace the example session secret and administrator password in `.env`. The public site runs at `http://127.0.0.1:3000`; the sign-in screen is at `/admin/login`.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Images

Local development stores uploads in `public/uploads`. Production can use Cloudinary by setting the optional variables in `.env.example`. Generated restaurant imagery is committed as optimized WebP files in `public/images`.

## Commit conventions

Commit messages use Conventional Commits. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the format, allowed types, rationale, and project-specific examples.
