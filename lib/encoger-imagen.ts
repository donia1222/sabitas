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
 * Devuelve la foto SIEMPRE rehecha: un fichero nuevo, con sus bytes en
 * memoria, listo para enviar.
 *
 * Lo de «siempre» es deliberado y es lo que cambio el 11/10/2026.
 *
 * Antes, si la foto ya era pequeña, se devolvia el fichero original tal cual.
 * Y resulta que en los tres intentos que le fallaron desde el iPhone, la foto
 * salia justo por uno de esos atajos: el apunte decia «encogida: 99623 bytes»
 * con los mismos bytes que entraron, o sea que iba el File original.
 *
 * Un File que sale de un <input type="file"> no lleva los bytes dentro: es un
 * puntero a un fichero del disco que el navegador tiene que ir a leer cuando
 * toca enviarlo. Si esa lectura falla —y en iOS puede fallar: el sistema
 * descarga la foto de iCloud, la mueve, o invalida el permiso— el navegador
 * manda la peticion con el cuerpo vacio. Y un cuerpo vacio con cabecera de
 * multipart explica EXACTAMENTE los dos sintomas que vimos: el parser de Node
 * decia «Failed to parse body as FormData», y reenviando los bytes crudos el
 * PHP contesta como si no le hubiera llegado ningun campo.
 *
 * Al pasarla siempre por el canvas, lo que se envia es un fichero fabricado
 * aqui, con sus bytes ya en memoria. No hay nada que ir a buscar al disco.
 *
 * Si el canvas no puede con ella se devuelve la original, que es lo que habia
 * antes: peor no se puede quedar.
 */
export async function encogerImagen(file: File): Promise<File> {
  try {
    if (!file.type.startsWith("image/")) return file
    // Los GIF pueden estar animados y el canvas se quedaria con un fotograma.
    if (file.type === "image/gif") return file

    const img = await leerComoImagen(file)
    const ancho = img.naturalWidth
    const alto = img.naturalHeight
    if (!ancho || !alto) return file

    const factor = Math.min(1, LADO_MAX / Math.max(ancho, alto))

    const lienzo = document.createElement("canvas")
    lienzo.width = Math.round(ancho * factor)
    lienzo.height = Math.round(alto * factor)
    const ctx = lienzo.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height)

    // Un PNG se queda en PNG: puede tener fondo transparente, y pasarlo a
    // JPEG se lo pintaria de negro. Lo demas va a JPEG, que pesa mucho menos.
    const esPng = file.type === "image/png"
    const salida = esPng ? "image/png" : "image/jpeg"

    const blob: Blob | null = await new Promise(res =>
      lienzo.toBlob(b => res(b), salida, esPng ? undefined : CALIDAD)
    )
    if (!blob || blob.size === 0) return file

    const ext = esPng ? ".png" : ".jpg"
    const nombre = file.name.replace(/\.[^.]+$/, "") + ext
    return new File([blob], nombre, { type: salida, lastModified: Date.now() })
  } catch {
    return file
  }
}

/** Para el aviso: «Das Bild ist zu gross (6.2 MB)». */
export function enMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB"
}
