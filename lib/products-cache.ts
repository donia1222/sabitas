// Caché compartido para productos.
// Nivel 1: memoria del módulo (dura la sesión SPA, más rápido).
// Nivel 2: localStorage slim (sobrevive F5, solo campos de listado).
// Si ambos fallan: fetch a /api/products (1 sola petición gracias a single-flight).

const LS_KEY = "fk-p2"
const TTL = 300_000  // 5 min

let _cache: { products: any[]; stats: any; at: number } | null = null
let _inflight: Promise<{ products: any[]; stats: any }> | null = null

// Solo los campos necesarios para mostrar la cuadrícula y la página de producto
function slim(p: any) {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    stock_status: p.stock_status,
    category: p.category,
    image_url: p.image_url,
    badge: p.badge,
    origin: p.origin,
    supplier: p.supplier,
    weight_kg: p.weight_kg,
    shipping_on_request: p.shipping_on_request,
    article_number: p.article_number,
    description: typeof p.description === "string" ? p.description.slice(0, 150) : "",
    image_urls: Array.isArray(p.image_urls) ? p.image_urls.filter(Boolean).slice(0, 2) : [],
    image_url_candidates: Array.isArray(p.image_url_candidates) ? p.image_url_candidates.slice(0, 3) : [],
    heat_level: p.heat_level,
  }
}

function saveLS(products: any[], stats: any) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      p: products.map(slim),
      s: stats ? { total_products: stats.total_products } : null,
      t: Date.now(),
    }))
  } catch {
    // Si falla (quota), intentar con mínimo absoluto
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        p: products.map(p => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, category: p.category, image_url: p.image_url })),
        s: null,
        t: Date.now(),
      }))
    } catch {}
  }
}

function loadLS(): { products: any[]; stats: any; at: number } | null {
  if (typeof window === "undefined") return null
  try {
    // Formato nuevo
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && Array.isArray(obj.p) && obj.t) return { products: obj.p, stats: obj.s, at: obj.t }
    }
    // Retrocompatibilidad con clave anterior "fk-products-slim"
    const old = localStorage.getItem("fk-products-slim")
    if (old) {
      const obj = JSON.parse(old)
      if (obj && Array.isArray(obj.p) && obj.t) return { products: obj.p, stats: obj.s, at: obj.t }
    }
    return null
  } catch { return null }
}

export async function getCachedProducts(bustServer = false): Promise<{ products: any[]; stats: any }> {
  // 1. Memoria fresca (solo si no se pide bust de servidor)
  if (!bustServer && _cache && Date.now() - _cache.at < TTL) {
    return { products: _cache.products, stats: _cache.stats }
  }

  // 2. localStorage fresco (solo si no se pide bust de servidor)
  if (!bustServer) {
    const ls = loadLS()
    if (ls && Date.now() - ls.at < TTL) {
      _cache = ls
      return { products: ls.products, stats: ls.stats }
    }
  }

  // 3. Single-flight: si ya hay fetch en curso y no es bust, esperar al mismo
  if (!bustServer && _inflight) return _inflight

  const url = bustServer ? `/api/products?_=${Date.now()}` : `/api/products`
  _inflight = fetch(url)
    .then(async (res) => {
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      _cache = { products: data.products, stats: data.stats, at: Date.now() }
      saveLS(data.products, data.stats)
      return { products: data.products, stats: data.stats }
    })
    .catch((e) => {
      // PHP caído: devolver datos stale antes que error
      if (_cache) return { products: _cache.products, stats: _cache.stats }
      const stale = loadLS()
      if (stale) return { products: stale.products, stats: stale.stats }
      throw e
    })
    .finally(() => { _inflight = null })

  return _inflight
}

export function bustProductsCache() {
  _cache = null
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(LS_KEY) } catch {}
  }
}

// Actualiza un producto en el caché sin hacer fetch a PHP
export function updateProductInCache(updated: any) {
  if (!_cache) return
  _cache = {
    products: _cache.products.map((p: any) => p.id === updated.id ? { ...p, ...updated } : p),
    stats: _cache.stats,
    at: _cache.at,
  }
  saveLS(_cache.products, _cache.stats)
}

// Elimina un producto del caché sin hacer fetch a PHP
export function removeProductFromCache(id: number) {
  if (!_cache) return
  const total = _cache.stats?.total_products
  _cache = {
    products: _cache.products.filter((p: any) => p.id !== id),
    stats: total ? { ..._cache.stats, total_products: total - 1 } : _cache.stats,
    at: _cache.at,
  }
  saveLS(_cache.products, _cache.stats)
}

// Añade un producto al caché sin hacer fetch a PHP
export function addProductToCache(product: any) {
  if (!_cache) return
  _cache = {
    products: [..._cache.products, product],
    stats: _cache.stats,
    at: _cache.at,
  }
  saveLS(_cache.products, _cache.stats)
}
