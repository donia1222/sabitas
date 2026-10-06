# CLAUDE.md

Guia para trabajar en este repositorio.

## Que es esto AHORA

Copia de una tienda online terminada —que esta en produccion en otro cliente—
reutilizada como base para **Sabitas** (sabitas.ch), una tienda suiza de piezas
hechas a mano con tela vaquera: bolsos, sudaderas y decoracion.

**Base de datos propia**, distinta de la del cliente original. Trabajar aqui no
puede afectarle a el.

**Los volcados de datos no viven en el repositorio.** Los que venian —clientes,
pedidos y contrasenas de la tienda anterior— se borraron el 07/10/2026 al
empezar el proyecto de cero. Si hace falta una copia de la base de datos, va
fuera del repositorio.

**Todo en local.** No se publica nada hasta que este terminado y ella diga que
si. Mientras tanto no hay prisa con las credenciales.

## La regla que manda: paquete 2, no paquete 3

De los tres paquetes que se le ofrecieron, Sabitas compro el **2** (CHF 500).
Lo que sobra **no se borra: se apaga con un interruptor**, para que pasar al
paquete 3 el dia de mañana sea cambiar un valor y no reprogramar.

**Esta dentro (paquete 2):** varias paginas con menu, que ella cambie todos los
textos e imagenes, crear categorias, galeria, blog, reseñas, SEO por pagina,
mapa y tarjeta de visita.

**Se apaga (paquete 3):** cuentas de clientas, pedidos y facturas, estadisticas,
vales y codigos, calculo de envios, y los cinco metodos de pago —estos ultimos
**visibles en el panel pero desmarcados y en gris**, con la nota «Gehort zu
Paket 3», para que vea que la casa esta construida.

**El carrito NO se apaga, se adapta.** Se queda tal cual —contador, pantalla,
fotos, total— y lo unico que cambia es el boton final: en vez de ir a la caja,
abre **WhatsApp con la cesta ya escrita**. No se pide direccion ni envio ni
pago, y **el pedido no se guarda en ninguna parte**: vive en el navegador.

**El chatbot de OpenAI se apaga** y no se menciona: cuesta dinero cada mes y no
aporta nada a una tienda de piezas unicas que vende por WhatsApp.

## Antes de publicar (NO antes, estamos en local)

Tres fallos heredados que hay que arreglar antes de subirla:

1. El panel compara con `NEXT_PUBLIC_ADMIN_PASSWORD`. Todo lo que empieza por
   `NEXT_PUBLIC_` **se incrusta en el JavaScript que descarga el visitante**:
   esa contraseña es publica. Tiene que comprobarse en el servidor.
2. `app/api/payment-settings/route.ts` lleva un token de administracion escrito
   a mano como valor por defecto. Debe vivir solo en variables de entorno.
3. `api/config.php` lleva la contraseña de la base de datos dentro y un
   comentario «FALTA COMPLETAR». Revisarla y moverla fuera de `www`.

## Comandos

- `npm run dev` — servidor en http://localhost:3000 (el suyo corre en el 3001)
- `npm run build` / `npm run start`
- `npm run lint`

No hay tests.

### NO compilar mientras el servidor de desarrollo este abierto

`next build` y `next dev` escriben en la **misma carpeta `.next`**. Si se
compila con el servidor abierto, el build borra y reescribe los ficheros que el
servidor tiene en uso y **se le cae**, con errores de este estilo:

    Error [PageNotFoundError]: Cannot find module for page: /api/auth

Paso el 06/10/2026: se compilaba para comprobar cada cambio y al otro lado se
le caia el servidor. Como arreglo iba levantando otro en el puerto siguiente, y
se llegaron a juntar **cuatro servidores de este proyecto a la vez** peleandose
por la misma `.next`.

**Para comprobar un cambio mientras el servidor esta abierto:** `npx tsc
--noEmit` y mirar la pagina. Compilar solo con el servidor parado, y si algo
queda raro, `rm -rf .next` antes de volver a arrancar.

## Como esta montado

- **Next.js 15** (App Router), React 19, TypeScript, Tailwind + shadcn/ui.
- **Backend propio en PHP + MySQL** en `api/` (~60 ficheros), servido desde
  `NEXT_PUBLIC_API_BASE_URL`. El frontal habla con el por `lib/api.ts`.
- **Ajustes**: tabla `site_content` (clave-valor, se crea sola) para textos e
  imagenes del sitio, y `payment_settings` con banderas `enable_*`. **Ese es el
  molde de los interruptores**: lo que se apague, se apaga igual.
- **Panel** en `/adminpanel` (`components/admin.tsx`, ~5.000 lineas) con diez
  pestañas.
- 8 errores de TypeScript **previos**, en rutas de API y en `ui/calendar.tsx`.
  El build los ignora (`next.config.mjs`). No son de este trabajo.

## Al escribir codigo

- Reusar los componentes de `components/ui/` antes de inventar otros.
- Tailwind primero; el tema vive en `tailwind.config.ts` y arrastra toda la
  tienda, que es donde se cambian los colores de Sabitas de una vez.
- Formularios con React Hook Form + Zod. Avisos con Sonner.
- Los componentes de cliente llevan `"use client"`.

## Donde esta cada cosa

El **backend PHP vive fuera del proyecto**, en `~/Desktop/sabitas-api/`, y se
sube a Hostpoint a mano (`https://web.lweb.ch/templettedhopnew/`). No esta en
el repositorio a proposito: no se despliega en Vercel, no lo usa el codigo de
Next y no tiene por que publicarse. La carpeta `api/` esta en `.gitignore`.

Lo que si esta aqui es `app/api/`, que son las rutas de Next que hacen de
intermediarias con esos PHP.
