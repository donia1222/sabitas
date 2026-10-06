import { NextRequest, NextResponse } from "next/server"
import { blogCache } from "../cache"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/add_blog_post.php"


export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? ""
    const body = await req.blob()
    const res = await fetch(PHP_URL, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
      cache: "no-store",
    })
    const data = await res.json()
    if (data.success) blogCache.clear()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
