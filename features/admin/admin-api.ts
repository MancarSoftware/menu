export class SessionExpiredError extends Error {}

export async function requestJson<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result = await response.json() as T & { error?: string };
  if (response.status === 401) throw new SessionExpiredError("La sesión expiró.");
  if (!response.ok) throw new Error(result.error ?? "No pudimos completar la operación.");
  return result;
}
