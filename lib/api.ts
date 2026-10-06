// Configuración de la API - Tu servidor
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export interface Product {
  id?: number
  name: string
  description: string
  price: number
  image?: string
  image_url?: string
  heat_level: number
  rating: number
  badge: string
  origin: string
  created_at?: string
  updated_at?: string
}

// Obtener todos los productos
export async function getProducts(search?: string): Promise<Product[]> {
  try {
    const url = search
      ? `${API_BASE_URL}/get_products.php?search=${encodeURIComponent(search)}`
      : `${API_BASE_URL}/get_products.php`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Error al obtener productos")
    }

    return data.products || []
  } catch (error) {
    console.error("Error fetching products:", error)
    throw error
  }
}

// Obtener un producto por ID
export async function getProduct(id: number): Promise<Product> {
  try {
    const response = await fetch(`${API_BASE_URL}/get_products.php?id=${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Error al obtener producto")
    }

    return data.product
  } catch (error) {
    console.error("Error fetching product:", error)
    throw error
  }
}

// Añadir nuevo producto
export async function addProduct(productData: Omit<Product, "id">, imageFile?: File): Promise<void> {
  try {
    const formData = new FormData()

    // Añadir datos del producto
    formData.append("name", productData.name)
    formData.append("description", productData.description)
    formData.append("price", productData.price.toString())
    formData.append("heat_level", productData.heat_level.toString())
    formData.append("rating", productData.rating.toString())
    formData.append("badge", productData.badge)
    formData.append("origin", productData.origin)

    // Añadir imagen si existe
    if (imageFile) {
      formData.append("image", imageFile)
    }

    const response = await fetch(`${API_BASE_URL}/add_product.php`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Error al añadir producto")
    }
  } catch (error) {
    console.error("Error adding product:", error)
    throw error
  }
}

// Editar producto existente
export async function updateProduct(id: number, productData: Partial<Product>, imageFile?: File): Promise<void> {
  try {
    const formData = new FormData()
    formData.append("id", id.toString())

    // Añadir solo los campos que se van a actualizar
    if (productData.name !== undefined) formData.append("name", productData.name)
    if (productData.description !== undefined) formData.append("description", productData.description)
    if (productData.price !== undefined) formData.append("price", productData.price.toString())
    if (productData.heat_level !== undefined) formData.append("heat_level", productData.heat_level.toString())
    if (productData.rating !== undefined) formData.append("rating", productData.rating.toString())
    if (productData.badge !== undefined) formData.append("badge", productData.badge)
    if (productData.origin !== undefined) formData.append("origin", productData.origin)

    // Añadir nueva imagen si existe
    if (imageFile) {
      formData.append("image", imageFile)
    }

    const response = await fetch(`${API_BASE_URL}/edit_product.php`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Error al actualizar producto")
    }
  } catch (error) {
    console.error("Error updating product:", error)
    throw error
  }
}

// Eliminar producto
export async function deleteProduct(id: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/edit_product.php`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `id=${id}`,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Error al eliminar producto")
    }
  } catch (error) {
    console.error("Error deleting product:", error)
    throw error
  }
}
