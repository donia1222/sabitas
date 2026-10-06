import { NextRequest, NextResponse } from "next/server"
import { isPhpBlocked, reportPhpError, clearPhpBlock } from "@/lib/php-guard"
import { phpFetch } from "@/lib/php-queue"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/get_categories.php"
const CACHE_TTL = 300_000  // 5 min

// global para sobrevivir HMR y aislamiento de módulos de Next.js
declare global {
  var __catsCache: { data: unknown; at: number } | null | undefined
  var __catsInflight: Promise<unknown> | null | undefined
}
if (global.__catsCache === undefined) global.__catsCache = null
if (global.__catsInflight === undefined) global.__catsInflight = null

export async function GET(req: NextRequest) {
  const bust = req.nextUrl.searchParams.has("_")
  if (!bust && global.__catsCache && Date.now() - global.__catsCache.at < CACHE_TTL) {
    return NextResponse.json(global.__catsCache.data)
  }
  if (bust) global.__catsCache = null

  if (isPhpBlocked()) {
    if (global.__catsCache) return NextResponse.json(global.__catsCache.data)
    return NextResponse.json({ success: false, error: "rate limited" }, { status: 429 })
  }

  if (global.__catsInflight) {
    try {
      const data = await global.__catsInflight
      return NextResponse.json(data)
    } catch {
      if (global.__catsCache) return NextResponse.json(global.__catsCache.data)
      return NextResponse.json({ success: false, error: "upstream error" }, { status: 502 })
    }
  }

  const promise = phpFetch(PHP_URL, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      global.__catsCache = { data, at: Date.now() }
      clearPhpBlock()
      return data
    })
    .catch((e) => {
      reportPhpError(parseInt(e.message) || 0)
      throw e
    })
    .finally(() => { global.__catsInflight = null })

  global.__catsInflight = promise

  try {
    const data = await promise
    return NextResponse.json(data)
  } catch (e: any) {
    if (global.__catsCache) return NextResponse.json(global.__catsCache.data)
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
