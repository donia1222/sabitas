import { NextResponse } from "next/server"
import { clearPhpBlock, isPhpBlocked } from "@/lib/php-guard"

declare global {
  var __catsCache: { data: unknown; at: number } | null | undefined
  var __payCache: { data: unknown; at: number } | null | undefined
  var __ordersCache: { data: unknown; at: number } | null | undefined
}

export async function GET() {
  const blocked = isPhpBlocked()
  return NextResponse.json({ blocked, message: blocked ? "PHP is rate-limited" : "PHP is OK" })
}

export async function POST() {
  clearPhpBlock()
  global.__catsCache = null
  global.__payCache = null
  global.__ordersCache = null
  return NextResponse.json({ success: true, message: "Guard reset and server caches cleared" })
}
