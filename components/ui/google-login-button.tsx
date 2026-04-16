"use client"

import { useRef, useState, useEffect } from "react"
import { GoogleLogin } from "@react-oauth/google"

interface GoogleLoginButtonProps {
  onSuccess: (credentialResponse: any) => void
  onError?: () => void
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
}

/**
 * A wrapper around GoogleLogin that dynamically measures the container width
 * and passes it as a pixel value. This fixes a bug where `width="100%"` is
 * interpreted as 0px in production builds due to SSR/hydration timing.
 */
export function GoogleLoginButton({
  onSuccess,
  onError,
  text = "continue_with",
}: GoogleLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [buttonWidth, setButtonWidth] = useState<number>(400)

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth
        if (w > 0) {
          setButtonWidth(w)
        }
      }
    }

    // Measure immediately after mount
    measure()

    // Also observe resize (e.g. viewport changes)
    const observer = new ResizeObserver(measure)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="w-full">
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError ?? (() => {})}
        size="large"
        text={text}
        shape="rectangular"
        theme="outline"
        width={String(buttonWidth)}
      />
    </div>
  )
}
