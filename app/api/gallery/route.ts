import { NextRequest, NextResponse } from "next/server"
import { galleryCache as cache } from "./cache"

const PHP_BASE = process.env.NEXT_PUBLIC_API_BASE_URL + "/get_gallery_images.php"
const CACHE_TTL = 5_000

export async function GET(_req: NextRequest) {
  const hit = cache.get("gallery")
  if (hit && Date.now() - hit.at < CACHE_TTL) return NextResponse.json(hit.data)
  try {
    const res = await fetch(PHP_BASE, { cache: "no-store" })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    cache.set("gallery", { data, at: Date.now() })
    return NextResponse.json(data)
  } catch (e: any) {
    if (hit) return NextResponse.json(hit.data)
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
