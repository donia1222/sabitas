// Caché compartido para productos.
// Nivel 1: memoria del módulo (dura la sesión SPA, más rápido).
// Nivel 2: localStorage slim (sobrevive F5, solo campos de listado).
// Si ambos fallan: fetch a /api/products (1 sola petición gracias a single-flight).

const LS_KEY = "fk-p2"
/**
 * Un minuto, no cinco.
 *
 * Cinco minutos aqui y otros cinco en el servidor se SUMAN: el navegador
 * espera a que caduque lo suyo y entonces pregunta al servidor, que puede
 * contestarle con una copia de hace casi cinco minutos. Editabas un producto
 * y la cuadricula podia tardar diez minutos en enterarse, que es justo lo que
 * pasaba. Con un minuto a cada lado, el peor caso son dos.
 */
const TTL = 60_000

let _cache: { products: any[]; stats: any; at: number; version?: string | null } | null = null
let _inflight: Promise<{ products: any[]; stats: any }> | null = null

/**
 * La huella del catálogo: un texto que cambia en cuanto se edita, se crea o
 * se borra un producto.
 *
 * Se pregunta antes de fiarse de lo guardado. Si no ha cambiado, se usa la
 * copia y no se pide nada más; si ha cambiado, se tira todo —aquí, en el
 * localStorage, en Vercel y en la caché de fichero del PHP— y se pide de
 * nuevo. Es lo que hace que un cambio del panel se vea al momento en vez de
 * en diez minutos.
 *
 * Si no se puede saber, se devuelve null y todo sigue midiéndose por reloj,
 * que es como funcionaba antes. Nunca deja la pantalla sin productos por
 * esto.
 */
async function huellaActual(): Promise<string | null> {
  try {
    const r = await fetch("/api/products/version", { cache: "no-store" })
    const d = await r.json()
    return d?.success && typeof d.version === "string" ? d.version : null
  } catch {
    return null
  }
}

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

function saveLS(products: any[], stats: any, version?: string | null) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      p: products.map(slim),
      s: stats ? { total_products: stats.total_products } : null,
      t: Date.now(),
      v: version ?? null,
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

function loadLS(): { products: any[]; stats: any; at: number; version?: string | null } | null {
  if (typeof window === "undefined") return null
  try {
    // Formato nuevo
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && Array.isArray(obj.p) && obj.t) return { products: obj.p, stats: obj.s, at: obj.t, version: obj.v ?? null }
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
  // 0. ¿Ha cambiado algo en el catálogo desde que guardamos esto?
  //    Una petición mínima que decide si lo guardado sirve o no sirve.
  const huella = bustServer ? null : await huellaActual()
  const sirve = (guardado: { version?: string | null } | null) =>
    !huella || !guardado || guardado.version === huella

  // 1. Memoria fresca, y de después del último cambio
  if (!bustServer && _cache && Date.now() - _cache.at < TTL && sirve(_cache)) {
    return { products: _cache.products, stats: _cache.stats }
  }

  // 2. localStorage fresco, con la misma condición
  if (!bustServer) {
    const ls = loadLS()
    if (ls && Date.now() - ls.at < TTL && sirve(ls)) {
      _cache = ls
      return { products: ls.products, stats: ls.stats }
    }
  }

  // 3. Single-flight: si ya hay fetch en curso y no es bust, esperar al mismo
  if (!bustServer && _inflight) return _inflight

  // La huella viaja con la petición: así Vercel sabe si SU copia vale, y si no
  // vale, le dice al PHP que tire también su caché de fichero.
  const url = bustServer
    ? `/api/products?_=${Date.now()}`
    : huella ? `/api/products?v=${encodeURIComponent(huella)}` : `/api/products`
  _inflight = fetch(url)
    .then(async (res) => {
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      _cache = { products: data.products, stats: data.stats, at: Date.now(), version: huella }
      saveLS(data.products, data.stats, huella)
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
    version: _cache.version,
  }
  saveLS(_cache.products, _cache.stats, _cache.version)
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
