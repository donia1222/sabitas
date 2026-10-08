"use client"

import { useEffect, useState } from "react"
import { contarCarrito, AVISO_CARRITO } from "@/lib/carrito"

/**
 * La cuenta del carrito, viva.
 *
 * Empieza en cero a propósito y se pone al día en cuanto monta: en el
 * servidor no hay `localStorage`, y si se leyera durante el primer pintado el
 * número del servidor y el del navegador no coincidirían (error de hidratación
 * de React).
 *
 * Escucha dos cosas distintas, y hacen falta las dos:
 *   - `carrito-cambiado`, nuestro, para los cambios de ESTA pestaña.
 *   - `storage`, el del navegador, para cuando se toca el carrito en OTRA.
 */
export function useCuentaCarrito(): number {
  const [cuenta, setCuenta] = useState(0)

  useEffect(() => {
    const poner = () => setCuenta(contarCarrito())
    poner()
    window.addEventListener(AVISO_CARRITO, poner)
    window.addEventListener("storage", poner)
    // Al volver a la pestaña: si compró desde otra, que se vea al mirar.
    window.addEventListener("focus", poner)
    return () => {
      window.removeEventListener(AVISO_CARRITO, poner)
      window.removeEventListener("storage", poner)
      window.removeEventListener("focus", poner)
    }
  }, [])

  return cuenta
}
