import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { staffDisplayName } from "./payment-labels";

type PaymentActor = { id: string; actorUserId: string | null; actorName: string };

// Preserve the recorded name. Older payments stored an email; resolve those on
// the server and never send email addresses to a receipt or collection ledger.
export async function resolvePaymentActorNames(events: PaymentActor[], client: Pick<Prisma.TransactionClient, "adminUser"> = db) {
  const legacy = events.filter((event) => !event.actorName.trim() || event.actorName.includes("@"));
  const staff = legacy.length ? await client.adminUser.findMany({
    where: { OR: [
      { id: { in: legacy.flatMap((event) => event.actorUserId ? [event.actorUserId] : []) } },
      { email: { in: legacy.filter((event) => event.actorName.includes("@")).map((event) => event.actorName) } },
    ] },
    select: { id: true, name: true, email: true },
  }) : [];
  return new Map(events.map((event) => {
    const person = legacy.includes(event) ? staff.find((user) => user.id === event.actorUserId)
      ?? staff.find((user) => user.email === event.actorName) : undefined;
    return [event.id, staffDisplayName(person?.name ?? event.actorName)];
  }));
}
