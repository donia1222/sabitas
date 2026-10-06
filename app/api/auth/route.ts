import { NextRequest, NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")

const PHP: Record<string, string> = {
  verify:            `${BASE}/get_user.php`,
  login:             `${BASE}/login_user.php`,
  register:          `${BASE}/create_user.php`,
  "reset-password":  `${BASE}/reset_password.php`,
  update:            `${BASE}/update_user.php`,
  delete:            `${BASE}/delete_user.php`,
  "change-password": `${BASE}/change_password.php`,
}

async function handle(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action")
  const phpUrl = action ? PHP[action] : null
  if (!phpUrl) return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
  try {
    const body = await req.text()
    const res = await fetch(phpUrl, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: body || undefined,
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }
}

export const POST = handle
export const PUT = handle
export const DELETE = handle
