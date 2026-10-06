/**
 * El token que abre los endpoints que escriben.
 *
 * Vive en la variable de entorno SHOP_ADMIN_TOKEN (Vercel y el .env de local)
 * y tiene que valer lo mismo que 'sabitas_admin_token' en
 * secure_config/almacen.php, fuera de www.
 *
 * Sin NEXT_PUBLIC_ delante a proposito: asi Next no lo mete en el javascript
 * que descarga el visitante. Esto solo se puede importar desde rutas de
 * app/api/, que corren en el servidor.
 *
 * No hay valor de respaldo escrito aqui: un token en el codigo es un token
 * publicado el dia que se abra el repositorio.
 */
export function cabecerasAdmin(extra: HeadersInit = {}): HeadersInit {
  const token = process.env.SHOP_ADMIN_TOKEN
  const cabeceras = new Headers(extra)
  if (token) cabeceras.set("X-Admin-Token", token)
  return cabeceras
}
