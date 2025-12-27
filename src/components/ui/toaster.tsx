"use client"

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      theme="light"
      position="bottom-right"
      toastOptions={{
        style: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        },
      }}
    />
  )
}

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message)
  },
  error: (message: string) => {
    sonnerToast.error(message)
  },
  info: (message: string) => {
    sonnerToast.info(message)
  },
}
