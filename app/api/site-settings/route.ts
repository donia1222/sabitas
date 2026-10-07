import { NextRequest, NextResponse } from "next/server"
import { cabecerasAdmin } from "@/lib/admin-token"
import { isPhpBlocked, reportPhpError, clearPhpBlock } from "@/lib/php-guard"
import { phpFetch } from "@/lib/php-queue"

// Esta ruta no se precalcula: lo que devuelve cambia cuando ella guarda.
export const dynamic = "force-dynamic"

/** Cabeceras para que nadie se quede con una copia por el camino. */
const SIN_CACHE = { "Cache-Control": "no-store, max-age=0" }

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")
/**
 * Treinta segundos, no cinco minutos.
 *
 * En Vercel cada peticion puede caer en una copia distinta del servidor, y
 * cada copia tiene su propia memoria: al guardar desde el panel se limpia la
 * de ESA copia, pero las demas siguen sirviendo lo viejo hasta que caduca. Por
 * eso los textos del hero y las tres cajas se actualizaban «a veces si, a
 * veces no». Con medio minuto, el peor caso es medio minuto.
 */
const TTL = 30_000

declare global {
  var __siteCache: { data: unknown; at: number } | null | undefined
  var __siteInflight: Promise<unknown> | null | undefined
}
if (global.__siteCache === undefined) global.__siteCache = null
if (global.__siteInflight === undefined) global.__siteInflight = null

export async function GET() {
  if (global.__siteCache && Date.now() - global.__siteCache.at < TTL) {
    return NextResponse.json(global.__siteCache.data, { headers: SIN_CACHE })
  }

  if (isPhpBlocked()) {
    if (global.__siteCache) return NextResponse.json(global.__siteCache.data, { headers: SIN_CACHE })
    return NextResponse.json({ success: false, error: "rate limited" }, { status: 429 })
  }

  if (global.__siteInflight) {
    try {
      const data = await global.__siteInflight
      return NextResponse.json(data, { headers: SIN_CACHE })
    } catch {
      if (global.__siteCache) return NextResponse.json(global.__siteCache.data, { headers: SIN_CACHE })
      return NextResponse.json({ success: false, error: "upstream error" }, { status: 502 })
    }
  }

  const promise = phpFetch(`${BASE}/get_site_settings.php`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      global.__siteCache = { data, at: Date.now() }
      clearPhpBlock()
      return data
    })
    .catch((e) => {
      reportPhpError(parseInt(e.message) || 0)
      throw e
    })
    .finally(() => { global.__siteInflight = null })

  global.__siteInflight = promise

  try {
    const data = await promise
    return NextResponse.json(data, { headers: SIN_CACHE })
  } catch (e: any) {
    if (global.__siteCache) return NextResponse.json(global.__siteCache.data, { headers: SIN_CACHE })
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const res = await fetch(`${BASE}/save_site_settings.php`, { method: "POST", headers: cabecerasAdmin(), body: formData })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    global.__siteCache = null
    return NextResponse.json(data, { headers: SIN_CACHE })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
