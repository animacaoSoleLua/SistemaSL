"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

interface ResetPasswordState {
  email: string;
  token: string;
}

interface ResetPasswordContextValue extends ResetPasswordState {
  setEmail: (value: string) => void;
  setToken: (value: string) => void;
  clear: () => void;
}

const ResetPasswordContext = createContext<ResetPasswordContextValue | null>(null);

export function ResetPasswordProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const value = useMemo(
    () => ({
      email,
      token,
      setEmail,
      setToken,
      clear: () => {
        setEmail("");
        setToken("");
      },
    }),
    [email, token]
  );

  return (
    <ResetPasswordContext.Provider value={value}>
      {children}
    </ResetPasswordContext.Provider>
  );
}

export function useResetPassword(): ResetPasswordContextValue {
  const ctx = useContext(ResetPasswordContext);
  if (!ctx) {
    throw new Error("useResetPassword deve ser usado dentro de ResetPasswordProvider");
  }
  return ctx;
}
