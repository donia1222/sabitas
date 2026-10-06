"use client"

import { ShoppingCart, Plus, Minus, X, Trash2, ArrowRight, Package } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useRouter } from "next/navigation"
import { features } from "@/lib/features"

interface Product {
  id: number
  name: string
  price: number
  image: string
  description: string
  heatLevel: number
  rating: number
  badge?: string
  origin?: string
}

interface CartItem extends Product {
  quantity: number
  image_url?: string
  image_url_candidates?: string[]
}

interface ShoppingCartProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  cart: CartItem[]
  onAddToCart: (product: Product) => void
  onRemoveFromCart: (productId: number) => void
  onGoToCheckout: () => void
  onClearCart: () => void
}

export function ShoppingCartComponent({
  isOpen,
  onOpenChange,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onGoToCheckout,
  onClearCart,
}: ShoppingCartProps) {
  const router = useRouter()
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)

  const handleGoToCheckout = () => {
    onGoToCheckout()
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="bg-white border-l border-gray-100 w-full sm:w-[420px] flex flex-col p-0 shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <SheetTitle className="leading-none" style={{ fontFamily: "var(--font-display), Georgia, serif", color: '#111111', fontSize: '1.1rem', fontWeight: 'normal' }}>Warenkorb</SheetTitle>
                <p className="text-xs text-gray-400 mt-0.5">{totalItems} {totalItems === 1 ? "Artikel" : "Artikel"}</p>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-400">Ihr Warenkorb ist leer</p>
              <p className="text-xs text-gray-300 mt-1">Fügen Sie Produkte hinzu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-100 transition-colors group"
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-bold line-clamp-2 leading-tight transition-colors ${ (item as any).item_type === "gutschein" ? "cursor-default text-gray-900" : "cursor-pointer text-brand hover:text-brand-dark" }`}
                        onClick={() => { if ((item as any).item_type === "gutschein") return; onOpenChange(false); router.push(`/product/${item.id}`) }}
                      >{item.name}</p>
                      <p className="text-sm font-black text-brand mt-1">{item.price.toFixed(2)} <span className="text-xs font-semibold text-gray-400">CHF</span></p>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onRemoveFromCart(item.id)}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all text-gray-500 shadow-sm"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-black text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => onAddToCart(item)}
                        className="w-7 h-7 rounded-lg bg-brand hover:bg-brand-dark text-white flex items-center justify-center transition-all shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-gray-100 p-4 bg-white flex-shrink-0 space-y-3">
            {/* Total */}
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-gray-500">Gesamt</span>
              <div className="text-right">
                <span className="text-2xl font-black text-gray-900 tracking-tight">{total.toFixed(2)}</span>
                <span className="text-sm text-gray-400 ml-1">CHF</span>
              </div>
            </div>

            {/* Checkout button */}
            <button
              onClick={handleGoToCheckout}
              className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold py-3.5 rounded-2xl text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand/30"
            >
              {features.caja ? "Zur Kasse" : "Warenkorb ansehen"}
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Clear */}
            <button
              onClick={onClearCart}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors py-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Warenkorb leeren
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
