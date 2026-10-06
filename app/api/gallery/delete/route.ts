import { NextRequest, NextResponse } from "next/server"
import { galleryCache } from "../cache"

const PHP_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/delete_gallery_image.php"

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
      if (data.success) galleryCache.clear()
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ success: false, error: text.slice(0, 300) }, { status: 502 })
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
