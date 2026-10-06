"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Share, Plus, MoreVertical, X, Smartphone } from "lucide-react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Registrar el service worker (necesario para que Android ofrezca instalación)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }

    // ¿Ya está instalada / abierta como app?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Detectar iOS (Safari no soporta instalación programática)
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    setIsIOS(ios)

    // Detectar dispositivo móvil (móvil/tablet) vs escritorio
    const mobile = ios || /android|iphone|ipad|ipod|mobile|tablet|silk|kindle/.test(ua) || navigator.maxTouchPoints > 1
    setIsMobile(mobile)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    const onInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
      setShowModal(false)
    }
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  // Si ya está instalada, no mostrar nada
  if (isStandalone) return null

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      try {
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === "accepted") setDeferredPrompt(null)
      } catch {
        /* noop */
      }
      return
    }
    // Sin prompt nativo (iOS o navegador sin soporte) → instrucciones
    setShowModal(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        App installieren
      </button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-brand" />
              App installieren
            </DialogTitle>
          </DialogHeader>

          {!isMobile && !deferredPrompt ? (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center">
                  <Smartphone className="w-7 h-7 text-brand" />
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  Diese App kann nur auf mobilen Geräten installiert werden
                </p>
                <p className="text-sm text-gray-600">
                  Öffnen Sie diese Website auf Ihrem Smartphone oder Tablet (iPhone, iPad oder Android),
                  um die App zum Startbildschirm hinzuzufügen.
                </p>
              </div>
            </div>
          ) : isIOS ? (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-600">
                Auf dem iPhone/iPad fügen Sie die App in wenigen Schritten zum Home-Bildschirm hinzu:
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">1</span>
                  <span className="text-sm text-gray-700 flex items-center gap-1 flex-wrap">
                    Tippen Sie unten in Safari auf das Teilen-Symbol
                    <Share className="w-4 h-4 inline text-blue-500" />
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">2</span>
                  <span className="text-sm text-gray-700 flex items-center gap-1 flex-wrap">
                    Wählen Sie <strong>„Zum Home-Bildschirm"</strong>
                    <Plus className="w-4 h-4 inline text-gray-500" />
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">3</span>
                  <span className="text-sm text-gray-700">
                    Bestätigen Sie mit <strong>„Hinzufügen"</strong> – fertig!
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-600">
                So fügen Sie die App zu Ihrem Startbildschirm hinzu:
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">1</span>
                  <span className="text-sm text-gray-700 flex items-center gap-1 flex-wrap">
                    Tippen Sie oben rechts im Browser auf das Menü
                    <MoreVertical className="w-4 h-4 inline text-gray-500" />
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">2</span>
                  <span className="text-sm text-gray-700">
                    Wählen Sie <strong>„App installieren"</strong> bzw. <strong>„Zum Startbildschirm hinzufügen"</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">3</span>
                  <span className="text-sm text-gray-700">
                    Bestätigen Sie die Installation – fertig!
                  </span>
                </li>
              </ol>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="mt-2 w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Schließen
          </button>
        </DialogContent>
      </Dialog>
    </>
  )
}
