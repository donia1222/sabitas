import type { NextRequest } from "next/server"
import { features } from "@/lib/features"
import OpenAI from "openai"

// Definimos el tipo de mensaje que enviamos a la API de OpenAI
type Message = {
  role: "system" | "user" | "assistant"
  content: string
}

// Formato de la respuesta JSON que devolvemos al frontend
type ChatResponse = {
  response?: string
  error?: string
}

export async function POST(request: NextRequest) {
  // El chatbot no entra en el paquete 2 y ademas gasta de la cuota de OpenAI
  // en cada mensaje. Ver lib/features.ts.
  if (!features.bot) {
    return new Response(JSON.stringify({ error: "Diese Funktion ist nicht aktiv." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    console.log("Recibiendo solicitud...")

    // 1) Extraemos los mensajes del body JSON
    const { messages } = await request.json()
    console.log("Mensajes recibidos:", messages)

    // 2) Validamos que sea un array y que no esté vacío
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log("Mensajes inválidos.")
      return Response.json({ error: "Mensajes inválidos." }, { status: 400 })
    }

    // 3) Chequeamos que cada mensaje tenga la forma { role, content }
    const isValid = messages.every(
      (msg: any) =>
        (msg.role === "system" || msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string",
    )

    if (!isValid) {
      console.log("Formato de mensajes inválido.")
      return Response.json({ error: "Formato de mensajes inválido." }, { status: 400 })
    }

    // 4) Creamos cliente de OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    console.log("Configuración de OpenAI creada.")

    // 5) Llamamos a la API de Chat Completions
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
    })

    console.log("Respuesta de OpenAI recibida:", completion)

    // 6) Extraemos la respuesta concreta del chatbot
    const botResponse = completion.choices[0]?.message?.content

    if (!botResponse) {
      throw new Error("No se recibió respuesta del modelo.")
    }

    console.log("Respuesta del bot:", botResponse)

    // 7) Enviamos la respuesta de nuevo al frontend
    return Response.json({ response: botResponse } as ChatResponse)
  } catch (error) {
    console.error("Error en el servidor:", error)
    return Response.json({ error: "Error al obtener la respuesta del chatbot." } as ChatResponse, { status: 500 })
  }
}
