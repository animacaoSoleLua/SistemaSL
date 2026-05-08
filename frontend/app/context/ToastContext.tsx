"use client";

import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";

export type ToastType = "error" | "success";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "DISMISS"; id: string };

export function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.toast];
    case "DISMISS":
      return state.filter((t) => t.id !== action.id);
  }
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type: ToastType) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  showToast: () => {},
  dismissToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: "DISMISS", id });
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      dispatch({ type: "ADD", toast: { id, message, type } });
      setTimeout(() => dismissToast(id), 3000);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
