"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

interface Anuncio {
  id: number
  title: string
  subtitle: string | null
  image1_url: string | null
  product_url: string | null
  show_once: boolean | number
}

/**
 * El aviso que ella escribe desde el panel («Anzeigen»).
 *
 * Sale una vez cargada la portada, encima de todo, y se cierra con la cruz o
 * tocando fuera. Si en el panel marca «solo una vez», se recuerda en el
 * navegador de quien lo vio y no vuelve a salir — por anuncio, no en general,
 * asi que el siguiente que escriba se vera igual.
 *
 * Espera a que termine la bienvenida: las dos cosas a la vez, el primer dia,
 * serian dos pantallas seguidas antes de ver la tienda.
 */
export function Anuncio() {
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelado = false

    fetch("/api/announcement?active=1")
      .then((r) => r.json())
      .then((d) => {
        if (cancelado || !d?.success) return
        // Con ?active=1 el servidor contesta `announcement` (uno solo); la
        // lista del panel usa `announcements`. Se aceptan las dos formas:
        // leer solo una era justo lo que dejaba el aviso sin salir.
        const activo: Anuncio | undefined = d.announcement ?? (d.announcements ?? [])[0]
        if (!activo) return

        const soloUnaVez = activo.show_once === true || activo.show_once === 1
        if (soloUnaVez) {
          try {
            if (localStorage.getItem(`sabitas_anuncio_${activo.id}`)) return
          } catch {
            // Sin localStorage se enseña igual: mejor verlo de mas que de menos.
          }
        }

        setAnuncio(activo)
        // Si es la primera visita, la bienvenida esta en pantalla sus dos
        // segundos; el aviso entra despues.
        const primeraVisita = document.documentElement.dataset.bienvenida === "1"
        const espera = primeraVisita ? 2900 : 700
        setTimeout(() => { if (!cancelado) setVisible(true) }, espera)
      })
      .catch(() => {})

    return () => { cancelado = true }
  }, [])

  const cerrar = () => {
    setVisible(false)
    if (!anuncio) return
    const soloUnaVez = anuncio.show_once === true || anuncio.show_once === 1
    if (soloUnaVez) {
      try { localStorage.setItem(`sabitas_anuncio_${anuncio.id}`, "1") } catch {}
    }
  }

  useEffect(() => {
    if (!visible) return
    const alPulsar = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar() }
    window.addEventListener("keydown", alPulsar)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", alPulsar)
      document.body.style.overflow = ""
    }
  }, [visible])

  if (!anuncio || !visible) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 anuncio-fondo"
      onClick={cerrar}
      role="dialog"
      aria-modal="true"
      aria-label={anuncio.title}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-[0_40px_90px_-40px_rgba(107,79,147,0.9)] anuncio-tarjeta"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={cerrar}
          aria-label="Schliessen"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 text-n-600 hover:text-brand flex items-center justify-center shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {anuncio.image1_url && (
          <img src={anuncio.image1_url} alt="" className="w-full h-48 sm:h-56 object-cover" />
        )}

        <div className="p-6 sm:p-7 text-center">
          <h2
            className="font-display font-semibold text-ink leading-tight"
            style={{ fontSize: "clamp(1.3rem, 4vw, 1.7rem)", letterSpacing: "-0.02em" }}
          >
            {anuncio.title}
          </h2>

          {anuncio.subtitle && (
            <p className="text-n-600 text-[15px] mt-3 leading-relaxed whitespace-pre-line">
              {anuncio.subtitle}
            </p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
            {anuncio.product_url && (
              <a
                href={anuncio.product_url}
                className="inline-flex items-center justify-center bg-brand hover:bg-brand-dark text-white font-semibold text-[14.5px] px-6 py-3 rounded-full transition-colors"
              >
                Mehr erfahren
              </a>
            )}
            <button
              onClick={cerrar}
              className="inline-flex items-center justify-center border border-brand-pale text-brand font-semibold text-[14.5px] px-6 py-3 rounded-full hover:bg-brand-tint/60 transition-colors"
            >
              Weiter zum Shop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
