export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { cabecerasAdmin } from "@/lib/admin-token"
import * as XLSX from "xlsx"
import { clearPhpBlock, reportPhpError } from "@/lib/php-guard"
import { clearCache as clearProductsCache } from "@/app/api/products/cache"


function toSlug(sheetName: string): string {
  return sheetName
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Para la carpeta de imágenes en el servidor: ö→o, ü→u, ä→a, espacios→_
function toFolder(sheetName: string): string {
  return sheetName
    .trim()
    .replace(/\s*\d{4}$/, "")   // quitar año al final
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}


function getCol(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key]
    }
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: "No se recibió ningún archivo" }, { status: 400 })
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json({ success: false, error: "El archivo debe ser .xlsx o .xls" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })

    const allProducts: object[] = []

    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })

      const categorySlug = toSlug(sheetName)
      const categoryName = sheetName.trim()

      const artikelToUrl = new Map<string, string>()
      const sheetRef = ws["!ref"]
      if (sheetRef) {
        const range = XLSX.utils.decode_range(sheetRef)
        let artikelCol = -1
        for (let c = range.s.c; c <= range.e.c; c++) {
          const h = (ws[XLSX.utils.encode_cell({ r: range.s.r, c })] as any)?.v
          if (h === "Artikel-Nr." || h === "ID" || h === "id") { artikelCol = c; break }
        }
        if (artikelCol >= 0) {
          for (let r = range.s.r + 1; r <= range.e.r; r++) {
            const artCell = ws[XLSX.utils.encode_cell({ r, c: artikelCol })] as any
            if (!artCell) continue
            const artNr = String(artCell.v ?? "").trim()
            if (!artNr) continue
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cell = ws[XLSX.utils.encode_cell({ r, c })] as any
              if (!cell) continue
              const val = String(cell.v ?? cell.l?.Target ?? cell.f ?? "").trim()
              if (/^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif)$/i.test(val)) {
                artikelToUrl.set(artNr, val)
                break
              }
            }
          }
        }
      }

      for (const row of rows) {
        const id = getCol(row, "ID", "id", "Artikel-Nr.")
        const name = getCol(row, "Name", "name")

        if (!id || !name) continue

        const idStr = String(id).trim()
        // article_number: prefer "Artikel-Nr." column; fall back to "ID"
        const articleNumber = String(getCol(row, "Artikel-Nr.", "article_number") ?? id).trim()
        let numId: number
        if (/^\d+$/.test(idStr)) {
          numId = parseInt(idStr, 10)
        } else {
          let hash = 0
          for (let i = 0; i < idStr.length; i++) {
            hash = ((hash << 5) - hash + idStr.charCodeAt(i)) | 0
          }
          numId = Math.abs(hash) || 1
        }

        const price = parseFloat(String(getCol(row, "Preis inkl. MwSt.", "Preis zzgl. MwSt.", "Preis", "price", "VK-Preis") ?? 0).replace(",", ".")) || 0
        const stock = parseInt(String(getCol(row, "Lager", "Lagerbestand", "Bestand", "Stock", "stock") ?? 0), 10) || 0
        const description = String(getCol(row, "Beschreibung") ?? "").trim()
        const supplier = String(getCol(row, "Lieferant") ?? "").trim()
        const origin = String(getCol(row, "Hersteller") ?? "").trim()
        const weight_kg = parseFloat(String(getCol(row, "Gewicht kg", "Gewicht (kg)", "Gewicht", "weight_kg") ?? 0)) || 0.500

        const artikelNr = articleNumber
        const rawImage = artikelToUrl.get(artikelNr)
          || String(getCol(row, "URLs der Bilder", "Bild", "Bild URL", "Image", "image_url", "Foto") ?? "").trim()
        // La imagen se toma tal cual venga en el Excel. Si no hay, el producto
        // queda sin imagen y ProductImage muestra el placeholder.
        const image_url = rawImage

        allProducts.push({
          id: numId,
          article_number: articleNumber,
          name: String(name).trim(),
          description,
          price,
          stock,
          supplier,
          origin,
          category: categorySlug,
          category_name: categoryName,
          image_url,
          weight_kg,
        })
      }
    }

    if (allProducts.length === 0) {
      return NextResponse.json({ success: false, error: "No se encontraron productos válidos en el archivo" }, { status: 400 })
    }

    // Llama al PHP que NO borra nada
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
    const phpResponse = await fetch(`${apiBase}/add_products_excel.php`, {
      method: "POST",
      headers: cabecerasAdmin({ "Content-Type": "application/json" }),
      body: JSON.stringify({ products: allProducts }),
    })

    const text = await phpResponse.text()
    let result: any
    try {
      result = JSON.parse(text)
    } catch {
      reportPhpError(phpResponse.status)
      return NextResponse.json({ success: false, error: `PHP error (${phpResponse.status})` }, { status: 502 })
    }

    if (phpResponse.ok && result.success) {
      clearPhpBlock()
      clearProductsCache()  // borra caché de servidor para que el próximo GET devuelva datos frescos
    } else {
      reportPhpError(phpResponse.status)
    }

    return NextResponse.json({ ...result, parsed: allProducts.length })
  } catch (error) {
    console.error("Error añadiendo productos:", error)
    return NextResponse.json({ success: false, error: "Error interno al procesar el archivo" }, { status: 500 })
  }
}
