"use client"

import { useEffect, useState } from "react"

/**
 * La pantalla de bienvenida: el logo, un par de segundos, y se va.
 *
 * Solo la primera visita. Quien lo decide no es este componente sino el
 * script del <head> (ver app/layout.tsx), que mira localStorage antes de que
 * se pinte nada y marca el <html>. Aqui solo se apaga: se espera, se funde y
 * se quita la marca, que es lo que devuelve la pagina a la normalidad.
 *
 * Si el navegador no deja usar localStorage —ventana privada, cookies
 * bloqueadas— no se marca el <html> y no se ve: mejor no verla que verla
 * cada vez.
 */
export function Bienvenida() {
  const [seVa, setSeVa] = useState(false)

  useEffect(() => {
    const raiz = document.documentElement
    if (raiz.dataset.bienvenida !== "1") return

    try { localStorage.setItem("sabitas_bienvenida_vista", "1") } catch {}

    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const espera = quieto ? 600 : 2000

    const salir = setTimeout(() => setSeVa(true), espera)
    const quitar = setTimeout(() => { delete raiz.dataset.bienvenida }, espera + 600)
    return () => { clearTimeout(salir); clearTimeout(quitar) }
  }, [])

  return (
    <div className={`bienvenida ${seVa ? "se-va" : ""}`} aria-hidden>
      <div className="flex flex-col items-center">
        <span className="logo-marco">
          <img src="/sabitas/logo.png" alt="" width={995} height={532} />
          <span className="brillo" />
        </span>
        <span className="costura" />
      </div>
    </div>
  )
}
