// Cola PHP global — usando `global` de Node.js para que el estado
// sea compartido entre todas las rutas aunque Next.js aísle los módulos.
// Solo 1 llamada a PHP en vuelo a la vez. Verifica el guard antes de cada llamada.

import { isPhpBlocked } from "./php-guard"

declare global {
  var __phpQueue: { queue: Array<() => void>; running: boolean } | undefined
}

if (!global.__phpQueue) {
  global.__phpQueue = { queue: [], running: false }
}

const state = global.__phpQueue

function runNext() {
  if (state.running || state.queue.length === 0) return
  state.running = true
  const task = state.queue.shift()!
  task()
}

export function phpFetch(url: string, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    state.queue.push(() => {
      // Re-check guard justo antes de ejecutar — si un fetch anterior activó el guard,
      // los siguientes en la cola se rechazan en vez de ir a PHP
      if (isPhpBlocked()) {
        const err = Object.assign(new Error("429"), { status: 429 })
        reject(err)
        state.running = false
        runNext()
        return
      }
      fetch(url, init)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          state.running = false
          runNext()
        })
    })
    runNext()
  })
}
