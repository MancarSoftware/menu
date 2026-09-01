const ECUADOR_TIME_ZONE = "America/Guayaquil";
const ECUADOR_UTC_OFFSET = "-05:00";

const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ECUADOR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getBusinessDate(value = new Date()) {
  const parts = businessDateFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("No pudimos determinar la fecha operativa.");
  return `${year}-${month}-${day}`;
}

export function isBusinessDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getBusinessDateRange(value: string) {
  if (!isBusinessDate(value)) throw new Error("La fecha seleccionada no es válida.");
  const start = new Date(`${value}T00:00:00${ECUADOR_UTC_OFFSET}`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
