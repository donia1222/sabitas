/**
 * Que esta encendido y que no, en el lado del navegador.
 *
 * Gemelo de `api/features.php`. Sabitas compro el PAQUETE 2; lo del 3 esta
 * apagado. Para pasar al 3 hay que cambiar los dos ficheros, no solo este:
 * apagarlo aqui esconde los botones, pero el que cierra la puerta es el PHP.
 *
 * No vive en la base de datos a proposito, para que no se pueda encender desde
 * el panel de contenidos.
 */

export const features = {
  // --- Paquete 2: encendido ---
  carrito: true,   // la cesta; termina en WhatsApp, no en una caja
  galeria: true,
  blog: true,

  // --- Paquete 3: apagado ---
  cuentas: false,  // registro, entrar, perfil, "mis pedidos"
  pedidos: false,  // guardar pedidos, facturas, estadisticas
  caja: false,     // direccion, envio y cobro
  vales: false,    // Gutscheine y codigos de descuento
  envios: false,   // calculo de portes por zonas
  bot: false,      // chatbot de OpenAI; ademas cuesta dinero al mes
} as const

export type Feature = keyof typeof features

/** El numero de paquete, solo para enseñarlo en el panel. */
export const PAQUETE = 2
