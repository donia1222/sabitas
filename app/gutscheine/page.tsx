import { Suspense } from "react"
import { notFound } from "next/navigation"
import { features } from "@/lib/features"
import GutscheineGrid from "@/components/gutscheine-grid"

export const metadata = {
  title: "Geschenkgutscheine – Sabitas",
  description: "Verschenken Sie Freude mit einem Gutschein von Sabitas.",
}

export default function GutscheinePage() {
  // Los vales son del paquete 3.
  if (!features.vales) notFound()

  return (
    <Suspense>
      <GutscheineGrid />
    </Suspense>
  )
}
