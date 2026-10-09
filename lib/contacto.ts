/**
 * Los datos de contacto de Sabitas, en un solo sitio.
 *
 * Los usan la tarjeta de visita (.vcf), el mapa del pie y los textos legales.
 * Antes cada uno tenia los suyos escritos a mano —y los tres seguian siendo
 * los de la plantilla: «Musterstrasse 1, 8000 Musterstadt» y un telefono de
 * ceros—, asi que cambiar un dato obligaba a buscarlo por media docena de
 * ficheros.
 *
 * La direccion es la suya de verdad, la que dio ella por WhatsApp el
 * 07/10/2026.
 */
export const CONTACTO = {
  /** Como se llama ella. */
  nombre: "Sabrina",
  apellido: "Steinbeck",
  /** El nombre de la marca. */
  empresa: "Sabitas",
  oficio: "Handgemachte Unikate",

  telefono: "+41 78 613 80 84",
  /** El mismo numero sin espacios, para los enlaces de llamada y WhatsApp. */
  telefonoPlano: "+41786138084",
  email: "hello@sabitas.ch",
  web: "https://sabitas.ch",

  calle: "Waldeggstrasse 10",
  localidad: "Ulisbach",
  codigoPostal: "9631",
  canton: "St. Gallen",
  pais: "Schweiz",
} as const

/** La direccion en una linea, para las pildoras y los enlaces. */
export const DIRECCION_COMPLETA =
  `${CONTACTO.calle}, ${CONTACTO.codigoPostal} ${CONTACTO.localidad}`

/** La misma, con el pais, para los textos legales. */
export const DIRECCION_LEGAL =
  `${DIRECCION_COMPLETA}, ${CONTACTO.pais}`

/** Se mantiene el nombre viejo para no tocar lo que ya lo usa. */
export const LOCALIDAD_COMPLETA = DIRECCION_COMPLETA

/** La consulta para Google Maps. */
export const CONSULTA_MAPA = encodeURIComponent(DIRECCION_LEGAL)

/**
 * La tarjeta de visita.
 *
 * `foto` es el logo en base64 (sin la cabecera «data:»). Si no se pudo
 * descargar, la tarjeta sale igual pero sin imagen: mejor una tarjeta sin foto
 * que ninguna tarjeta.
 */
export function construirVCard(foto?: string): string {
  const lineas = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${CONTACTO.apellido};${CONTACTO.nombre};;;`,
    `FN:${CONTACTO.nombre} ${CONTACTO.apellido} · ${CONTACTO.empresa}`,
    `ORG:${CONTACTO.empresa}`,
    `TITLE:${CONTACTO.oficio}`,
    `TEL;TYPE=CELL:${CONTACTO.telefonoPlano}`,
    `EMAIL:${CONTACTO.email}`,
    `URL:${CONTACTO.web}`,
    `ADR;TYPE=WORK:;;${CONTACTO.calle};${CONTACTO.localidad};${CONTACTO.canton};${CONTACTO.codigoPostal};${CONTACTO.pais}`,
  ]
  if (foto) lineas.push(`PHOTO;ENCODING=b;TYPE=PNG:${foto}`)
  lineas.push("END:VCARD")
  return lineas.join("\n")
}

/** Baja el .vcf, con el logo dentro si se deja. */
export async function descargarVCard(): Promise<void> {
  let foto: string | undefined
  try {
    const res = await fetch("/sabitas/logo.png")
    if (res.ok) {
      const blob = await res.blob()
      foto = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader()
        lector.onloadend = () => resolve((lector.result as string).split(",")[1])
        lector.onerror = reject
        lector.readAsDataURL(blob)
      })
    }
  } catch {
    // Sin foto, pero con tarjeta.
  }

  const enlace = document.createElement("a")
  enlace.href = URL.createObjectURL(
    new Blob([construirVCard(foto)], { type: "text/vcard;charset=utf-8" }),
  )
  enlace.download = `${CONTACTO.empresa}.vcf`
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(enlace.href)
}
