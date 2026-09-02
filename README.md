# El Bueno

A mobile-first fast-food ordering system for one restaurant per deployment. Customers can order at a table by QR, request delivery, or choose pickup. Staff receive every channel in one kitchen board, manage payments and cash shifts, and review auditable sales reports.

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

Hosted builds run `prisma migrate deploy` automatically before `next build`. Use `npm run build:local` for a local production compilation that must not apply migrations. Keep all database URLs and credentials in local or hosting-platform environment variables; never commit `.env`.

## Deployment model

This release is intentionally **single-tenant**: each client receives an isolated Vercel project and Neon database. There is no tenant table, shared client data, subscription system, or SaaS billing. This is the safest and simplest operating model for the current small- and medium-outlet audience. See [OPERATIONS.md](./OPERATIONS.md) for staging, backup, restore, monitoring, and client-launch procedures.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build:local
```

## Images

Local development stores uploads in `public/uploads`. Production can use Cloudinary by setting the optional variables in `.env.example`. Optimized WebP assets used by the public experience live in `public/images/fast-food`.

## Delivery staff and destination

- Create a **Repartidor** in **Equipo**. Drivers sign in at `/admin/login` and see only their assigned active deliveries, not the kitchen, reports, menu editor, or other staff accounts.
- **Repartos** lets admins/cashiers assign or reassign an active driver. The kitchen marks an order ready; the driver then selects **Salir a reparto → Confirmar entrega**. Customers see **En camino → Entregado** automatically.
- Delivery checkout requires a confirmed map point: request GPS permission or choose the destination manually on the map. A written address/reference is optional additional guidance. Pickup and table orders never require a location.
- Directions open Google Maps with the destination coordinates. The driver's current position is chosen by Google Maps; this app does not track drivers or customers continuously.
- Cash collection is disabled for drivers by default. An admin can grant it per driver in Equipo. Authorized drivers can record cash only for their own completed deliveries and only while a cash register is open. Other payments remain with caja. This records payment, not an online charge.
- Location is stored with the order, not in browser local storage. Legacy deliveries without coordinates retain address-based routing; staff should verify their address before departing.

No new secret is needed for maps. Leaflet loads only when delivery checkout mounts, OpenStreetMap provides map tiles with attribution, and directions use Google Maps URLs. GPS needs HTTPS (or localhost) and browser permission. OpenStreetMap's public tiles have no availability guarantee; review their [usage policy](https://operations.osmfoundation.org/policies/tiles/) before increasing traffic or promising delivery availability.

See the delivery staging checklist in [OPERATIONS.md](./OPERATIONS.md) before promoting this feature.

## Commit conventions

Use Conventional Commits. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the format and project-specific examples.
