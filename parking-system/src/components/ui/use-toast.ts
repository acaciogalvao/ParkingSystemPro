import { useState, useCallback } from "react"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

interface ToastState {
  toasts: Toast[]
}

let listeners: Array<(state: ToastState) => void> = []
let memoryState: ToastState = { toasts: [] }

function dispatch(action: { type: string; toast?: Toast }) {
  switch (action.type) {
    case "ADD_TOAST":
      if (action.toast) {
        memoryState.toasts = [...memoryState.toasts, action.toast]
      }
      break
    case "REMOVE_TOAST":
      if (action.toast) {
        memoryState.toasts = memoryState.toasts.filter((t) => t.id !== action.toast!.id)
      }
      break
  }

  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function genId() {
  return Math.random().toString(36).substr(2, 9)
}

export function toast({ title, description, variant = "default" }: {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}) {
  const id = genId()

  const newToast: Toast = {
    id,
    title,
    description,
    variant,
  }

  dispatch({
    type: "ADD_TOAST",
    toast: newToast,
  })

  // Auto remove after 5 seconds
  setTimeout(() => {
    dispatch({
      type: "REMOVE_TOAST",
      toast: newToast,
    })
  }, 5000)

  return {
    id,
    dismiss: () => dispatch({ type: "REMOVE_TOAST", toast: newToast }),
  }
}

export function useToast() {
  const [state, setState] = useState<ToastState>(memoryState)

  const subscribe = useCallback((listener: (state: ToastState) => void) => {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  React.useEffect(() => {
    const unsubscribe = subscribe(setState)
    return unsubscribe
  }, [subscribe])

  return {
    ...state,
    toast,
  }
}