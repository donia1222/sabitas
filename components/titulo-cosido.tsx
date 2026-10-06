"use client"

import { useEffect, useRef, useState } from "react"

/**
 * La etiqueta de seccion —SORTIMENT, HANDARBEIT, ENTDECKEN— con la costura
 * debajo.
 *
 * La costura se dibuja de izquierda a derecha cada vez que la etiqueta entra
 * en pantalla, y se recoge al salir, asi que se repite subiendo y bajando,
 * igual que los tres pasos. El estilo esta en globals.css (.titulo-cosido).
 *
 * Va en su propia linea: el titular grande viene debajo.
 */
export function EtiquetaCosida({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true)
      return
    }
    const observador = new IntersectionObserver(
      ([entrada]) => setVisible(entrada.isIntersecting),
      { threshold: 0.6 },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      <span
        className={`titulo-cosido text-[12.5px] font-semibold uppercase tracking-[0.24em] text-brand ${
          visible ? "cosido-visible" : ""
        }`}
      >
        {children}
      </span>
    </div>
  )
}
