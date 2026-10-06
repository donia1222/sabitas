"use client"

import { useRouter, notFound } from "next/navigation"
import { features } from "@/lib/features"
import { Suspense } from "react"
import { UserProfile } from "@/components/user-profile"

function ProfileContent() {
  // Las cuentas de clientas son del paquete 3. Sin ellas esta pagina no existe
  // —404 de verdad, para que tampoco la indexe Google—.
  if (!features.cuentas) notFound()

  const router = useRouter()

  return (
    <UserProfile
      onClose={() => router.push("/")}
      onAccountDeleted={() => router.push("/")}
    />
  )
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  )
}
