"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function ConstructionNotice() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show the notice after a short delay when component mounts
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Website im Aufbau</h2>
            </div>
          </div>

          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertDescription className="text-gray-700 leading-relaxed">
              <strong>Wichtiger Hinweis:</strong> Diese Website befindet sich derzeit noch im Aufbau. Bitte tätigen Sie
              noch <strong>keine Bestellungen</strong>, da das System noch nicht vollständig funktionsfähig ist.
              <br />
              <br />
              Vielen Dank für Ihr Verständnis!
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button onClick={() => setIsVisible(false)} className="bg-amber-600 hover:bg-amber-700 text-white">
              <X className="h-4 w-4 mr-2" />
              Verstanden
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
