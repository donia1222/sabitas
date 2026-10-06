// Caché compartido para categorías — mismo patrón que products-cache.ts.
// Una sola petición por sesión, persiste en localStorage.

const LS_KEY = "fk-cats"
const TTL = 300_000  // 5 min

let _cache: { categories: any[]; at: number } | null = null
let _inflight: Promise<any[]> | null = null

function saveLS(categories: any[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ c: categories, t: Date.now() }))
  } catch {}
}

function loadLS(): { categories: any[]; at: number } | null {
  if (typeof window === "undefined") return null
  try {
    // Formato nuevo
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && Array.isArray(obj.c) && obj.t) return { categories: obj.c, at: obj.t }
    }
    // Retrocompatibilidad con clave anterior "fk-categories" (formato { data, at })
    const old = localStorage.getItem("fk-categories")
    if (old) {
      const obj = JSON.parse(old)
      if (obj && Array.isArray(obj.data) && obj.at) return { categories: obj.data, at: obj.at }
    }
    return null
  } catch { return null }
}

export async function getCachedCategories(bustServer = false): Promise<any[]> {
  if (!bustServer && _cache && Date.now() - _cache.at < TTL) return _cache.categories

  if (!bustServer) {
    const ls = loadLS()
    if (ls && Date.now() - ls.at < TTL) {
      _cache = ls
      return ls.categories
    }
  }

  if (!bustServer && _inflight) return _inflight

  const url = bustServer ? `/api/categories?_=${Date.now()}` : `/api/categories`
  _inflight = fetch(url)
    .then(async (res) => {
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      _cache = { categories: data.categories, at: Date.now() }
      saveLS(data.categories)
      return data.categories
    })
    .catch((e) => {
      if (_cache) return _cache.categories
      const stale = loadLS()
      if (stale) return stale.categories
      throw e
    })
    .finally(() => { _inflight = null })

  return _inflight
}

export function bustCategoriesCache() {
  _cache = null
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(LS_KEY) } catch {}
  }
}
