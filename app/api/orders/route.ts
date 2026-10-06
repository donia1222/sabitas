import { NextRequest, NextResponse } from "next/server"
import { isPhpBlocked, reportPhpError, clearPhpBlock } from "@/lib/php-guard"
import { phpFetch } from "@/lib/php-queue"

const PHP = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") + "/get_orders.php"
const CACHE_TTL = 30_000

declare global {
  var __ordersCache: Map<string, { data: unknown; at: number }> | undefined
  var __ordersInflight: Map<string, Promise<unknown>> | undefined
}
if (!global.__ordersCache) global.__ordersCache = new Map()
if (!global.__ordersInflight) global.__ordersInflight = new Map()

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString()
  const url = qs ? `${PHP}?${qs}` : PHP
  const cache = global.__ordersCache!
  const inflight = global.__ordersInflight!

  const hit = cache.get(qs)
  if (hit && Date.now() - hit.at < CACHE_TTL) return NextResponse.json(hit.data)

  if (isPhpBlocked()) {
    if (hit) return NextResponse.json(hit.data)
    return NextResponse.json({ success: false, error: "rate limited" }, { status: 429 })
  }

  const existing = inflight.get(qs)
  if (existing) {
    try { return NextResponse.json(await existing) } catch {
      if (hit) return NextResponse.json(hit.data)
      return NextResponse.json({ success: false, error: "upstream error" }, { status: 502 })
    }
  }

  const promise = phpFetch(url, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw Object.assign(new Error(`${res.status}`), { status: res.status })
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

  inflight.set(qs, promise)

  try {
    return NextResponse.json(await promise)
  } catch (e: any) {
    if (hit) return NextResponse.json(hit.data)
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
