// stacy.olympics.com blocks non-browser User-Agents (confirmed: a bare curl/Node request gets
// HTTP 403, the same request with a real browser UA gets 200 — CORS itself is wide open). Every
// call here now runs server-side (inside Next.js route handlers), so there's no real browser in
// front of it to supply one automatically — it has to be set explicitly.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export async function fetchOdfJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { "User-Agent": BROWSER_USER_AGENT } });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.json() as Promise<T>;
}
