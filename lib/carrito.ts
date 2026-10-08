/**
 * La cuenta del carrito, en un solo sitio.
 *
 * El carrito vive en `localStorage["cantina-cart"]`, pero hasta ahora cada
 * pantalla se lo apañaba por su cuenta: Home y la colección llevaban la cuenta
 * en su propio estado y se la pasaban a la cabecera, y las otras seis
 * —galería, blog, sobre mí, contacto, novedades y el detalle de producto—
 * pintaban la cabecera sin pasarle nada. Como el valor por defecto es cero,
 * enseñaban un cero fijo aunque el carrito tuviera dos cosas dentro.
 *
 * Aquí la cabecera se la calcula ella sola y deja de depender de que cada
 * pantalla se acuerde de dárselo.
 */

const CLAVE = "cantina-cart"
const AVISO = "carrito-cambiado"

/** Cuántas unidades hay en el carrito. Cero si no hay nada o no se puede leer. */
export function contarCarrito(): number {
  if (typeof window === "undefined") return 0
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return 0
    const lista = JSON.parse(crudo)
    if (!Array.isArray(lista)) return 0
    return lista.reduce((total: number, item: any) => total + (Number(item?.quantity) || 0), 0)
  } catch {
    return 0
  }
}

/**
 * Avisar de que el carrito ha cambiado.
 *
 * Hace falta un aviso propio: el evento `storage` del navegador **solo lo
 * reciben las OTRAS pestañas**, nunca la que acaba de escribir, que es justo
 * la que tiene que enterarse. Por eso añadir algo al carrito desde la ficha de
 * un producto no movía el número de arriba.
 */
export function avisarCarrito(): void {
  if (typeof window === "undefined") return
  try { window.dispatchEvent(new Event(AVISO)) } catch {}
}

/** Guarda el carrito y avisa. Lo que debería usar todo el que escriba. */
export function guardarCarrito(lista: unknown[]): void {
  if (typeof window === "undefined") return
  try {
    if (Array.isArray(lista) && lista.length > 0) {
      localStorage.setItem(CLAVE, JSON.stringify(lista))
    } else {
      localStorage.removeItem(CLAVE)
    }
  } catch {}
  avisarCarrito()
}

export { AVISO as AVISO_CARRITO }
