import { NextRequest, NextResponse } from "next/server"
import { isPhpBlocked, reportPhpError, clearPhpBlock } from "@/lib/php-guard"
import { phpFetch } from "@/lib/php-queue"

const PHP = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") + "/edit_product.php"

export async function POST(req: NextRequest) {
  if (isPhpBlocked()) {
    return NextResponse.json({ success: false, error: "rate limited" }, { status: 429 })
  }
  try {
    const formData = await req.formData()
    const res = await phpFetch(PHP, { method: "POST", body: formData })
    if (!res.ok) { reportPhpError(res.status); throw new Error(`${res.status}`) }
    const data = await res.json()
    clearPhpBlock()
    return NextResponse.json(data)
  } catch (e: any) {
    if (!e.message?.includes("rate")) reportPhpError(parseInt(e.message) || 0)
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest) {
  if (isPhpBlocked()) {
    return NextResponse.json({ success: false, error: "rate limited" }, { status: 429 })
  }
  try {
    const body = await req.text()
    const res = await phpFetch(PHP, {
      method: "DELETE",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    if (!res.ok) { reportPhpError(res.status); throw new Error(`${res.status}`) }
    const data = await res.json()
    clearPhpBlock()
    return NextResponse.json(data)
  } catch (e: any) {
    if (!e.message?.includes("rate")) reportPhpError(parseInt(e.message) || 0)
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}
