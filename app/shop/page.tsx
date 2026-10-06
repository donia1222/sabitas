import { Suspense } from "react"
import ShopGrid from "@/components/shop-grid"

export default function ShopPage() {
  return (
    <Suspense>
      <ShopGrid />
    </Suspense>
  )
}
