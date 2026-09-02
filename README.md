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

- Create a **Repartidor** in **Equipo**. Drivers sign in at `/admin/login` and see only their assigned deliveries, not the kitchen, reports, menu editor, or other staff accounts. **Pendientes** keeps unfinished/unpaid work visible; **Completadas** retains delivered orders after payment, with a delivery-date filter and pagination.
- **Repartos** lets admins/cashiers assign or reassign an active driver. The kitchen marks an order ready; the driver then selects **Salir a reparto → Confirmar entrega**. Customers see **En camino → Entregado** automatically.
- Delivery checkout requires a confirmed map point: request GPS permission or choose the destination manually on the map. A written address/reference is optional additional guidance. Pickup and table orders never require a location.
- Directions open Google Maps with the destination coordinates. The driver's current position is chosen by Google Maps; this app does not track drivers or customers continuously.
- Collection is disabled for drivers by default. An admin can independently grant **Efectivo**, **Tarjeta**, and **Transferencia** in Equipo. Existing cash permission is preserved; the new permissions default to off. Drivers can collect only their own completed deliveries. Cash requires an open register; card and transfer require staff to verify receipt of funds externally. This records an already received payment, not an online charge or bank verification.
- Resumen, Ventas and Caja refresh every 5 seconds and on window focus/reconnection. Revenue uses the **payment collection date** in `America/Guayaquil`, even when the order was placed the previous day. The Today view rolls over at midnight; manually selected historical dates remain selected.
- **Caja → Cobros del día** uses the same `PaymentEvent` ledger as Ventas. It shows gross collections by method (cash/card/transfer), refunds and net revenue, plus paginated movements with receipt, collector name, payment timestamp and cash shift. Totals always cover the entire selected day, not just the current page. Payments without a shift remain visible as **Sin turno de caja**; they are not automatically attached to a later shift.
- **Caja → Turno de caja** is separate: expected cash = opening balance + cash payments − cash refunds assigned to that shift, including driver collections. Card/transfer never increase expected cash. A shift can span midnight; changing the daily report date does not change the active shift. This is expected cash for reconciliation, not proof that a driver has physically handed it over.
- If a collection seems missing, check its **payment date**, **method**, **collector**, and **shift** in the daily ledger. An unpaid order does not count as revenue. A recorded payment without a shift still counts in the daily report; investigate legacy records rather than collecting the order again or silently rewriting historical cash shifts.
- **Ver / imprimir comprobante** opens a dedicated print page, available to a driver only for their own deliveries. Receipts show quantities, line totals, delivery fee and the collector/driver's name, never their account email. Legacy payment email labels resolve to the staff name when available, otherwise to a neutral label. These are order receipts, not tax invoices. Turn off browser print headers/footers to omit the browser URL.
- Location is stored with the order, not in browser local storage. Legacy deliveries without coordinates retain address-based routing; staff should verify their address before departing.

No new secret is needed for maps. Leaflet loads only when delivery checkout mounts, OpenStreetMap provides map tiles with attribution, and directions use Google Maps URLs. GPS needs HTTPS (or localhost) and browser permission. OpenStreetMap's public tiles have no availability guarantee; review their [usage policy](https://operations.osmfoundation.org/policies/tiles/) before increasing traffic or promising delivery availability.

See the delivery staging checklist in [OPERATIONS.md](./OPERATIONS.md) before promoting this feature.

## Commit conventions

Use Conventional Commits. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the format and project-specific examples.
