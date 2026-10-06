import { NextResponse } from "next/server"
import { announcementCache } from "./cache"
import { phpFetch } from "@/lib/php-queue"

const TTL = 60_000

const inflight = new Map<string, Promise<unknown>>()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const active = searchParams.get("active")
  const cacheKey = active ? "active" : "all"

  const cached = announcementCache.get(cacheKey)
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json(cached.data)
  }

  const existing = inflight.get(cacheKey)
  if (existing) {
    try {
      const data = await existing
      return NextResponse.json(data)
    } catch {
      if (cached) return NextResponse.json(cached.data)
      return NextResponse.json({ success: false, error: "upstream error" }, { status: 502 })
    }
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
  const url = active
    ? `${apiBase}/get_announcement.php?active=1`
    : `${apiBase}/get_announcement.php`

  const promise = phpFetch(url, { cache: "no-store" })
    .then(async (res) => {
      const text = await res.text()
      if (!res.ok) {
        console.error("[announcement GET] PHP error status:", res.status, "body:", text.slice(0, 500))
        throw new Error(`HTTP ${res.status}`)
      }
      const data = JSON.parse(text)
      announcementCache.set(cacheKey, { data, at: Date.now() })
      return data
    })
    .finally(() => inflight.delete(cacheKey))

  inflight.set(cacheKey, promise)

  try {
    const data = await promise
    return NextResponse.json(data)
  } catch (e: any) {
    if (cached) return NextResponse.json(cached.data)
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
