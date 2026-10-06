"use client"

import { useRouter } from "next/navigation"
import { AlertCircle, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function PayPalCancelPage() {
  const router = useRouter()

  const goBackToStore = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="text-center p-12">
          <AlertCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-red-700 mb-4">Zahlung abgebrochen</h1>
          <p className="text-xl text-gray-600 mb-6">Sie haben die PayPal-Zahlung abgebrochen.</p>

          <div className="bg-red-50 rounded-lg p-6 mb-6">
            <p className="text-red-700">Es wurde keine Zahlung verarbeitet. Ihre Produkte bleiben im Warenkorb.</p>
          </div>

          <div className="space-y-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={goBackToStore} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Zurück zum Shop
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
