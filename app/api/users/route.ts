import { NextResponse } from "next/server"
import { isPhpBlocked, reportPhpError, clearPhpBlock } from "@/lib/php-guard"
import { phpFetch } from "@/lib/php-queue"

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")
const TTL = 60_000 // 1 min

declare global {
  var __usersCache: { data: unknown; at: number } | null | undefined
  var __usersInflight: Promise<unknown> | null | undefined
}
if (global.__usersCache === undefined) global.__usersCache = null
if (global.__usersInflight === undefined) global.__usersInflight = null

export async function GET() {
  if (global.__usersCache && Date.now() - global.__usersCache.at < TTL) {
    return NextResponse.json(global.__usersCache.data)
  }

  if (isPhpBlocked()) {
    if (global.__usersCache) return NextResponse.json(global.__usersCache.data)
    return NextResponse.json({ success: false, error: "rate limited" }, { status: 429 })
  }

  if (global.__usersInflight) {
    try {
      const data = await global.__usersInflight
      return NextResponse.json(data)
    } catch {
      if (global.__usersCache) return NextResponse.json(global.__usersCache.data)
      return NextResponse.json({ success: false, error: "upstream error" }, { status: 502 })
    }
  }

  const promise = phpFetch(`${BASE}/get_users.php`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      global.__usersCache = { data, at: Date.now() }
      clearPhpBlock()
      return data
    })
    .catch((e) => {
      reportPhpError(parseInt(e.message) || 0)
      throw e
    })
    .finally(() => { global.__usersInflight = null })

  global.__usersInflight = promise

  try {
    const data = await promise
    return NextResponse.json(data)
  } catch (e: any) {
    if (global.__usersCache) return NextResponse.json(global.__usersCache.data)
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
