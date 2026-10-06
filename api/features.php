<?php
/**
 * Que esta encendido y que no.
 *
 * Sabitas compro el PAQUETE 2. Lo que es del paquete 3 no se borra: se apaga
 * aqui. El dia que pase al 3, se cambia `false` por `true` en este fichero y
 * en `lib/features.ts` —son los dos unicos sitios— y a funcionar.
 *
 * Esto NO vive en la base de datos a proposito: si estuviera en `site_content`,
 * ella podria encenderlo sola desde el panel de contenidos.
 */

const FEATURES = [
    // --- Paquete 2: encendido ---
    'carrito'   => true,   // la cesta; termina en WhatsApp, no en una caja
    'galeria'   => true,
    'blog'      => true,

    // --- Paquete 3: apagado ---
    'cuentas'   => false,  // registro, entrar, perfil, "mis pedidos"
    'pedidos'   => false,  // guardar pedidos, facturas, estadisticas
    'caja'      => false,  // direccion, envio y cobro
    'vales'     => false,  // Gutscheine y codigos de descuento
    'envios'    => false,  // calculo de portes por zonas
    'bot'       => false,  // chatbot de OpenAI; ademas cuesta dinero al mes
];

function featureOn(string $clave): bool {
    return FEATURES[$clave] ?? false;
}

/**
 * Corta la peticion si la funcion esta apagada.
 *
 * Esto es lo que de verdad cierra la puerta: esconder el boton en la pagina no
 * sirve de nada si el endpoint sigue aceptando lo que le manden.
 */
function requireFeature(string $clave): void {
    if (featureOn($clave)) return;
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error'   => 'Diese Funktion ist nicht aktiv.',
        'feature' => $clave,
    ]);
    exit();
}
