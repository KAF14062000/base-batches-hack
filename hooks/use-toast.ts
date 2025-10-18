"use client"

import * as React from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 4000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

type Toast = Omit<ToasterToast, "id">

type ToastState = {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const listeners = new Set<(state: ToastState) => void>()
let memoryState: ToastState = { toasts: [] }

function dispatch(action: { type: "ADD"; toast: Toast } | { type: "DISMISS"; toastId?: string } | { type: "REMOVE"; toastId?: string }) {
  switch (action.type) {
    case "ADD": {
      const toast = {
        id: action.toast.id ?? Math.random().toString(36).slice(2),
        open: true,
        onOpenChange: (open: boolean) => {
          if (!open) {
            dismiss(toast.id)
          }
        },
        ...action.toast,
      }

      memoryState = { ...memoryState, toasts: [toast, ...memoryState.toasts].slice(0, TOAST_LIMIT) }
      break
    }
    case "DISMISS": {
      const { toastId } = action
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.map((toast) => (toast.id === toastId || toastId === undefined ? { ...toast, open: false } : toast)),
      }
      break
    }
    case "REMOVE": {
      const { toastId } = action
      memoryState = {
        ...memoryState,
        toasts: toastId === undefined ? [] : memoryState.toasts.filter((toast) => toast.id !== toastId),
      }
      break
    }
    default:
      memoryState = memoryState
  }

  listeners.forEach((listener) => listener(memoryState))
}

export const toast = ({ ...props }: Toast) => {
  const id = Math.random().toString(36).slice(2)

  const update = (toastProps: Toast) => {
    dispatch({
      type: "ADD",
      toast: { ...toastProps, id },
    })
  }

  update(props)

  if (toastTimeouts.has(id)) {
    clearTimeout(toastTimeouts.get(id))
  }

  toastTimeouts.set(
    id,
    setTimeout(() => dispatch({ type: "REMOVE", toastId: id }), TOAST_REMOVE_DELAY),
  )

  return {
    id,
    dismiss: () => dismiss(id),
    update,
  }
}

export const dismiss = (toastId?: string) => {
  dispatch({ type: "DISMISS", toastId })
  if (toastId) {
    const timeout = toastTimeouts.get(toastId)
    if (timeout) {
      clearTimeout(timeout)
      toastTimeouts.delete(toastId)
    }
  }
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss,
  }
}

export type { Toast, ToasterToast }
