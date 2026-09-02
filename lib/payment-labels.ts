export const paymentMethodLabels = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" };
export function staffDisplayName(value: string | null | undefined) {
  return value?.trim() && !value.includes("@") ? value.trim() : "Personal del local";
}
