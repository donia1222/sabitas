import type { MetadataRoute } from "next"

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || "https://sabitas.vercel.app").replace(/\/$/, "")

/**
 * Lo que Google puede mirar y lo que no.
 *
 * El panel y las rutas internas quedan fuera: no son paginas para nadie que
 * llegue de una busqueda, y que aparezcan solo da pistas de donde esta la
 * puerta de atras.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/adminpanel", "/api/", "/checkout", "/success", "/profile"],
    },
    sitemap: `${SITIO}/sitemap.xml`,
  }
}
