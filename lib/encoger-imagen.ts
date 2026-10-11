/**
 * Encoger una foto en el navegador ANTES de subirla.
 *
 * Por que existe esto (11/10/2026):
 *
 * Sabrina podia crear un producto o una categoria con foto desde el
 * ordenador, pero desde el movil no se guardaba: salia el loader y el modal
 * no se cerraba nunca. La causa no estaba en el PHP ni en el panel, sino en
 * medio: **Vercel rechaza con 413 cualquier peticion de mas de ~4,5 MB antes
 * de ejecutar una sola linea de codigo**. Medido contra sabitas.ch: 3 MB
 * pasan, 5 MB ya no. Y una foto de movil pasa de eso casi siempre, mientras
 * que las que ella elegia en el ordenador ya venian pequenas.
 *
 * Encogerlas aqui arregla las dos cosas de golpe: entran de sobra en el
 * limite, y la tienda deja de servirle a los clientes fotos de varios megas.
 *
 * Reglas:
 *  - Nunca agranda: una foto pequena se deja tal cual.
 *  - Si algo falla —formato raro, canvas bloqueado— devuelve el fichero
 *    original. Encoger es una mejora, no un sitio donde perder una foto.
 *  - Mantiene la proporcion.
 */

/** Lado largo maximo. 2000 px es de sobra para una ficha y pesa poco. */
const LADO_MAX = 2000

/** Calidad del JPEG. 0.85 no se distingue a ojo y baja mucho el peso. */
const CALIDAD = 0.85

/** Por debajo de esto no se toca nada: ya es pequena. */
const NO_TOCAR_BYTES = 600 * 1024

export const LIMITE_SUBIDA_BYTES = 4 * 1024 * 1024

function leerComoImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("no se puede leer la imagen")) }
    img.src = url
  })
}

/**
 * Devuelve la misma foto encogida, o la original si no hace falta tocarla o
 * si algo sale mal.
 */
export async function encogerImagen(file: File): Promise<File> {
  try {
    if (!file.type.startsWith("image/")) return file
    // Los GIF pueden estar animados y el canvas se quedaria con un fotograma.
    if (file.type === "image/gif") return file
    if (file.size <= NO_TOCAR_BYTES) return file

    const img = await leerComoImagen(file)
    const ancho = img.naturalWidth
    const alto = img.naturalHeight
    if (!ancho || !alto) return file

    const factor = Math.min(1, LADO_MAX / Math.max(ancho, alto))
    // Ya cabe de sobra y no es grande de medidas: no merece la pena recodificar.
    if (factor === 1 && file.size <= LIMITE_SUBIDA_BYTES) return file

    const lienzo = document.createElement("canvas")
    lienzo.width = Math.round(ancho * factor)
    lienzo.height = Math.round(alto * factor)
    const ctx = lienzo.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height)

    const blob: Blob | null = await new Promise(res =>
      lienzo.toBlob(b => res(b), "image/jpeg", CALIDAD)
    )
    if (!blob || blob.size === 0) return file
    // Si por lo que sea saliera mas gorda, nos quedamos con la original.
    if (blob.size >= file.size) return file

    const nombre = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([blob], nombre, { type: "image/jpeg", lastModified: Date.now() })
  } catch {
    return file
  }
}

/** Para el aviso: «Das Bild ist zu gross (6.2 MB)». */
export function enMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB"
}
