# Operations runbook

## Environments

- `main` deploys to Vercel Production and uses the production Neon branch.
- `staging` deploys to Vercel Preview and uses the staging Neon branch.
- Scope `DATABASE_URL` and `SESSION_SECRET` to their exact environment/branch in Vercel.
- Cloudinary can be shared during the demo; give each paying client a dedicated Cloudinary environment before launch.
- Never copy production customer/order data into a public demo without anonymizing it.

## Deployment and migrations

The Vercel build command is `npm run build`. It generates Prisma Client, runs pending migrations with `prisma migrate deploy`, and builds Next.js. A failed migration stops deployment before the new version receives traffic. Test every migration on `staging` before merging to `main`.

Local compilation uses `npm run build:local` so a developer does not accidentally migrate the database referenced by the local `.env`.

## Backups and restore

1. Keep Neon point-in-time restore/branch history enabled within the retention offered by the active plan.
2. Before a risky production migration, create a protected Neon branch named `backup-YYYY-MM-DD-purpose` from `production`.
3. Monthly, export a logical backup from a trusted machine:
   `pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" --file el-bueno-YYYY-MM-DD.dump`
4. Store dumps encrypted outside the repository.
5. Restore only into a new Neon branch first:
   `pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" el-bueno-YYYY-MM-DD.dump`
6. Point staging at the restored branch, run the smoke checklist, then promote or switch production only after verification.

Perform a restore drill at least quarterly. A backup is not considered valid until it has been restored successfully.

## Monitoring

- `/api/health` reports application/database availability and is suitable for an external uptime monitor.
- Vercel logs receive structured JSON for unexpected API errors. Configure alerts for repeated HTTP 500/503 responses.
- Review Vercel Functions, Error Rate, and Neon connection usage weekly during the pilot.
- Add a dedicated error-tracking provider when the client approves the service and data-retention terms; no third-party telemetry secret is required for this demo.

## Client launch checklist

1. Create a dedicated Vercel project, Neon database/branch, session secret, and Cloudinary environment.
2. Configure restaurant details, final menu, product photos, prices, tables, staff accounts, WhatsApp, and domain.
3. Configure the custom domain in Vercel and update DNS at the registrar; keep HTTPS enforced.
4. Print fresh QR cards only after the final domain is active. Existing QR URLs must never contain `localhost` or a preview deployment hostname.
5. Verify table QR, delivery, pickup, kitchen, cash/card/transfer, refund, daily numbering, and reports on real phones.
6. Open and close a test cash shift, then remove demo transactions before opening day.

## Staging reset

An administrator can call `POST /api/admin/demo-reset` with `{ "confirmation": "RESET DEMO" }`. It is blocked outside Vercel Preview unless `ALLOW_DEMO_RESET=true`. It deletes orders, payment events, shifts, counters, and audit events but preserves the restaurant, menu, tables, and staff.
