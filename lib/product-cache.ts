/**
 * Client-side in-memory cache for products and resolved image URLs.
 * Survives across component mounts / page navigations within the same session.
 */

interface Product {
  id: number
  [key: string]: unknown
}

interface CacheEntry {
  data: { success: boolean; products?: Product[]; product?: Product }
  at: number
}

const TTL = 60_000 // 60 s client-side
const cache = new Map<string, CacheEntry>()

/** Fetch products through /api/products with client-side caching */
export async function fetchProductsCached(
  query = "",
  signal?: AbortSignal,
): Promise<{ success: boolean; products?: Product[]; product?: Product }> {
  const key = query
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.data

  const url = query ? `/api/products?${query}` : "/api/products"
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${res.status}`)
  const data = await res.json()
  cache.set(key, { data, at: Date.now() })
  return data
}

// ── Image URL resolution cache ──
// Once we know which candidate URL actually loads, remember it
// in memory AND in localStorage so subsequent page loads skip the 404s.

const LS_KEY = "fk-img-resolved"
const MAX_ENTRIES = 3000

const resolvedImages = new Map<string, string>()

// Load from localStorage once at module init (client-only)
if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) {
      const obj = JSON.parse(stored) as Record<string, string>
      for (const [k, v] of Object.entries(obj)) resolvedImages.set(k, v)
    }
  } catch {}
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function persistToLocalStorage() {
  if (typeof window === "undefined") return
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      // Trim to MAX_ENTRIES if needed (keep newest by evicting oldest keys)
      if (resolvedImages.size > MAX_ENTRIES) {
        const keys = Array.from(resolvedImages.keys())
        keys.slice(0, resolvedImages.size - MAX_ENTRIES).forEach(k => resolvedImages.delete(k))
      }
      const obj: Record<string, string> = {}
      resolvedImages.forEach((v, k) => { obj[k] = v })
      localStorage.setItem(LS_KEY, JSON.stringify(obj))
    } catch {}
  }, 1000) // batch writes: wait 1s after last resolve
}

/** Get previously resolved image URL for a source */
export function getResolvedImage(src: string): string | undefined {
  return resolvedImages.get(src)
}

/** Store a resolved image URL */
export function setResolvedImage(src: string, resolvedUrl: string): void {
  resolvedImages.set(src, resolvedUrl)
  persistToLocalStorage()
}
