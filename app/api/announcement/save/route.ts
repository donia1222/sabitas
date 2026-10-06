import { NextRequest, NextResponse } from "next/server"
import { announcementCache } from "../cache"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/save_announcement.php"

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
    const text = await res.text()
    try {
      const data = JSON.parse(text)
      if (data.success) announcementCache.clear()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ success: false, error: text.slice(0, 300) }, { status: 502 })
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")
    const res = await fetch(`${PHP_URL}?id=${id}&_method=DELETE`, {
      method: "DELETE",
      cache: "no-store",
    })
    const text = await res.text()
    try {
      const data = JSON.parse(text)
      if (data.success) announcementCache.clear()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ success: false, error: text.slice(0, 300) }, { status: 502 })
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
