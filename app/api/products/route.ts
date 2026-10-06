import { NextRequest, NextResponse } from "next/server"
import { isPhpBlocked, reportPhpError, clearPhpBlock } from "@/lib/php-guard"
import { phpFetch } from "@/lib/php-queue"
import { cache } from "./cache"

const PHP_BASE = process.env.NEXT_PUBLIC_API_BASE_URL + "/get_products.php"
const CACHE_TTL = 300_000  // 5 min

const inflight = new Map<string, Promise<unknown>>()

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  // _= es cache-buster del admin: quiere datos frescos
  const bustCache = params.has("_")
  params.delete("_")
  const qs = params.toString()
  // Al hacer bust, pasar ?_ a PHP para que también invalide su caché de archivo
  const phpQs = bustCache ? (qs ? `_=1&${qs}` : `_=1`) : qs
  const url = phpQs ? `${PHP_BASE}?${phpQs}` : PHP_BASE
  const hit = cache.get(qs)

  // 1. Caché fresco
  if (!bustCache && hit && Date.now() - hit.at < CACHE_TTL) {
    return NextResponse.json(hit.data)
  }

  // 2. Producto por ID: si la lista completa está en caché y fresca, servir desde ahí.
  //    Aplica también para cache-busters — si la lista ya es fresca no hay que ir a PHP.
  //    Si no está en la lista fresca → 404 directo, sin tocar PHP.
  if (params.has("id") && params.size === 1) {
    const productId = String(params.get("id"))
    const fullList = cache.get("")
    if (fullList && Date.now() - fullList.at < CACHE_TTL) {
      const full = fullList.data as any
      const product = full?.products?.find((p: any) => String(p.id) === productId)
      if (product) return NextResponse.json({ success: true, product })
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }
  }

  // 3. Guard global: aplica siempre, incluyendo cache-busters del admin.
  //    Si PHP está caído, datos stale son mejor que un 502 que desencadena más intentos.
  if (isPhpBlocked()) {
    if (hit) return NextResponse.json(hit.data)
    return NextResponse.json({ success: false, error: "rate limited" }, { status: 429 })
  }

  // 4. Single-flight: si ya hay un fetch en curso para esta key, esperar al mismo
  const existing = inflight.get(qs)
  if (!bustCache && existing) {
    try {
      const data = await existing
      return NextResponse.json(data)
    } catch {
      if (hit) return NextResponse.json(hit.data)
      return NextResponse.json({ success: false, error: "upstream error" }, { status: 502 })
    }
  }

  const promise = phpFetch(url, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      cache.set(qs, { data, at: Date.now() })
      clearPhpBlock()
      return data
    })
    .catch((e) => {
      reportPhpError(parseInt(e.message) || 0)
      throw e
    })
    .finally(() => inflight.delete(qs))

  if (!bustCache) inflight.set(qs, promise)

  try {
    const data = await promise
    return NextResponse.json(data)
  } catch (e: any) {
    if (hit) return NextResponse.json(hit.data)
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
