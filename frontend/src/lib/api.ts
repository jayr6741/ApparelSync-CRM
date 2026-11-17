const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export type ApiError = { error?: string; details?: unknown };

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (payload as ApiError).error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}
