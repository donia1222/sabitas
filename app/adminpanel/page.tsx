"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Admin } from "@/components/admin"

export default function AdminMusterstadtPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("admin-login-state")
      if (savedSession) {
        const loginState = JSON.parse(savedSession)
        if (loginState.isLoggedIn && loginState.timestamp && loginState.email) {
          const now = new Date().getTime()
          const loginTime = new Date(loginState.timestamp).getTime()
          const daysDiff = (now - loginTime) / (1000 * 60 * 60 * 24)
          if (daysDiff < 7) {
            setIsAuthorized(true)
            return
          }
        }
      }
    } catch {}
    router.replace("/")
  }, [router])

  if (!isAuthorized) return null

  return <Admin onClose={() => router.push("/")} />
}
