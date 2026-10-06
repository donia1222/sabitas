"use client"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Shield, CheckCircle, AlertCircle, Lock } from "lucide-react"

interface StripePaymentProps {
  amount: number
  currency: string
  orderData: any
  onSuccess: (paymentIntent: any) => void
  onError: (error: string) => void
  disabled?: boolean
  publishableKey?: string
  secretKey?: string
}

const StripeCheckoutForm = ({ amount, currency, orderData, onSuccess, onError, disabled, secretKey }: StripePaymentProps) => {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [cardholderName, setCardholderName] = useState(`${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || disabled) return

    setIsProcessing(true)
    setPaymentStatus("processing")
    setErrorMessage("")

    const cardElement = elements.getElement(CardElement)
    
    try {
      // 1. Crear Payment Intent en el backend
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: currency.toLowerCase(),
          orderData,
          stripeSecretKey: secretKey,
        })
      })

      if (!response.ok) {
        throw new Error('Error creating payment intent')
      }

      const { clientSecret } = await response.json()

      // 2. Confirmar el pago con Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement!,
          billing_details: {
            name: cardholderName || `${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`,
            email: orderData.customerInfo.email,
            address: {
              line1: orderData.customerInfo.address,
              city: orderData.customerInfo.city,
              postal_code: orderData.customerInfo.postalCode,
              country: 'CH'
            }
          }
        }
      })

      if (error) {
        setPaymentStatus("error")
        setErrorMessage(error.message || "Error procesando el pago")
        onError(error.message || "Error procesando el pago")
      } else if (paymentIntent.status === 'succeeded') {
        setPaymentStatus("success")
        onSuccess(paymentIntent)
      }
    } catch (err: any) {
      setPaymentStatus("error")
      const message = err.message || "Error inesperado al procesar el pago"
      setErrorMessage(message)
      onError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cardholder Name Field */}
        <div className="space-y-2">
          <Label htmlFor="cardholderName" className="text-sm font-medium text-gray-700">
            Name auf der Karte
          </Label>
          <Input
            id="cardholderName"
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="Vollständiger Name wie auf der Karte"
            disabled={disabled || isProcessing}
            className="w-full bg-white text-black"
          />
        </div>

        <div className="p-4 border border-gray-300 rounded-lg bg-white shadow-sm">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                  fontSmoothing: 'antialiased',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
              hidePostalCode: true,
            }}
          />
        </div>

        {paymentStatus === "error" && errorMessage && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}

        {paymentStatus === "success" && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Zahlung erfolgreich abgeschlossen!</span>
          </div>
        )}

        <Button 
          type="submit" 
          disabled={!stripe || isProcessing || paymentStatus === "success" || disabled || !cardholderName.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          size="lg"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Zahlung wird verarbeitet...
            </>
          ) : paymentStatus === "success" ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Zahlung abgeschlossen
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              {amount.toFixed(2)} CHF mit Karte bezahlen
            </>
          )}
        </Button>
      </form>

      {/* Security Information */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="font-medium">Sichere Zahlung</span>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>256-bit SSL Verschlüsselung</span>
          </div>
          <div>• Visa, Mastercard, American Express</div>
          <div>• 3D Secure Authentifizierung</div>
          <div>• PCI DSS Level 1 zertifiziert</div>
        </div>
      </div>
    </div>
  )
}

export function StripePayment(props: StripePaymentProps) {
  const key = props.publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  if (!key) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Stripe nicht konfiguriert</span>
        </div>
        <p className="text-xs text-red-500 mt-1">
          Bitte konfigurieren Sie die Stripe-Schlüssel im Admin-Panel unter Zahlung.
        </p>
      </div>
    )
  }

  const stripePromise = loadStripe(key)

  return (
    <Elements stripe={stripePromise}>
      <StripeCheckoutForm {...props} />
    </Elements>
  )
}