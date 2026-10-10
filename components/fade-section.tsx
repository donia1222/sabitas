"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Aparecer suavemente al entrar en pantalla.
 *
 * El bloque empieza invisible y 22px mas abajo, y sube hasta su sitio cuando
 * asoma por el borde inferior. Con `delay` se escalonan varios para que no
 * entren todos de golpe: lo normal es 0, 80, 160, 240...
 *
 * Tres cuidados que no se ven pero importan:
 *
 * - **Quien pide menos movimiento, no lo tiene.** Si el sistema esta en
 *   «reducir movimiento» (iOS y macOS lo tienen en Accesibilidad) se muestra
 *   todo visible y quieto desde el primer momento.
 * - **Sin JavaScript no desaparece la pagina.** El marcado sale del servidor
 *   con opacity:0, asi que si el JS no llega el texto seria invisible. Por eso
 *   cada bloque lleva `data-fade` y en app/layout.tsx hay un <noscript> que lo
 *   fuerza a visible.
 * - **Arranca antes de verse.** El rootMargin de -40px hace que empiece justo
 *   cuando asoma, no cuando ya esta medio dentro, que se nota tarde.
 */
export function FadeSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [sinMovimiento, setSinMovimiento] = useState(false)

  useEffect(() => {
    // Preferencia del sistema. Si la pide, no hay animacion ninguna.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) {
      setSinMovimiento(true)
      setVisible(true)
      return
    }

    const el = ref.current
    if (!el) return

    // Navegador antiguo sin IntersectionObserver: se muestra y ya esta.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-fade=""
      className={className}
      style={
        sinMovimiento
          ? undefined
          : {
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(22px)",
              transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
              willChange: visible ? undefined : "opacity, transform",
            }
      }
    >
      {children}
    </div>
  )
}
