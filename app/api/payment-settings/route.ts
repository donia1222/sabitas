import { NextRequest, NextResponse } from "next/server"
import { isPhpBlocked, reportPhpError, clearPhpBlock } from "@/lib/php-guard"
import { phpFetch } from "@/lib/php-queue"

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")
const TTL = 600_000 // 10 min

// Token servidor-a-servidor para guardar ajustes de pago. Se ejecuta SOLO en el
// servidor (Vercel), nunca llega al navegador. Debe coincidir con
// 'shop_admin_token' en secure_config/almacen.php. Se puede sobreescribir con
// la variable de entorno SHOP_ADMIN_TOKEN en Vercel.
const SHOP_ADMIN_TOKEN = process.env.SHOP_ADMIN_TOKEN || "d621582296ee0f274eedfa1cde94bf2b7c5d078bee1d846d"

declare global {
  var __payCache: { data: unknown; at: number } | null | undefined
  var __payInflight: Promise<unknown> | null | undefined
}
if (global.__payCache === undefined) global.__payCache = null
if (global.__payInflight === undefined) global.__payInflight = null

export async function GET() {
  if (global.__payCache && Date.now() - global.__payCache.at < TTL) {
    return NextResponse.json(global.__payCache.data)
  }

  if (isPhpBlocked()) {
    if (global.__payCache) return NextResponse.json(global.__payCache.data)
    return NextResponse.json({ success: false, error: "rate limited" }, { status: 429 })
  }

  if (global.__payInflight) {
    try {
      const data = await global.__payInflight
      return NextResponse.json(data)
    } catch {
      if (global.__payCache) return NextResponse.json(global.__payCache.data)
      return NextResponse.json({ success: false, error: "upstream error" }, { status: 502 })
    }
  }

  const promise = phpFetch(`${BASE}/get_payment_settings.php`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      global.__payCache = { data, at: Date.now() }
      clearPhpBlock()
      return data
    })
    .catch((e) => {
      reportPhpError(parseInt(e.message) || 0)
      throw e
    })
    .finally(() => { global.__payInflight = null })

  global.__payInflight = promise

  try {
    const data = await promise
    return NextResponse.json(data)
  } catch (e: any) {
    if (global.__payCache) return NextResponse.json(global.__payCache.data)
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${BASE}/save_payment_settings.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, admin_token: SHOP_ADMIN_TOKEN }),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    global.__payCache = null
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
