"use client"

import { useState, useEffect } from "react"

const PLACEHOLDER = "/placeholder.jpg"

// Las imágenes llegan del backend. Se prueban en orden y, si todas fallan,
// el componente cae al placeholder.
function buildCandidates(src: string | null | undefined, candidates?: string[]): string[] {
  const inputs = candidates && candidates.length > 0 ? candidates : src ? [src] : []

  const result: string[] = []
  const seen = new Set<string>()
  for (const u of inputs) {
    if (u && !seen.has(u)) { seen.add(u); result.push(u) }
  }

  return result
}

interface ProductImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined
  candidates?: string[]
  alt: string
  onAllFailed?: () => void
}

export function ProductImage({ src, candidates, alt, onAllFailed, ...props }: ProductImageProps) {
  const urls = buildCandidates(src, candidates)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => { setAttempt(0) }, [src])

  const failed = urls.length === 0 || attempt >= urls.length

  useEffect(() => {
    if (failed && onAllFailed) onAllFailed()
  }, [failed, onAllFailed])

  if (failed) {
    const { className, ...rest } = props
    return (
      <img
        src={PLACEHOLDER}
        alt={alt}
        className={`object-contain p-4 bg-n-50 ${className ?? ""}`}
        {...rest}
      />
    )
  }

  return (
    <img
      src={urls[attempt]}
      alt={alt}
      onError={() => setAttempt(a => a + 1)}
      {...props}
    />
  )
}
