"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push("/tela-recuperacao");
    }, 800);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <main className="page login-page">
      <div className="login-card reveal">
        <h1 className="login-title">Recuperação de senha</h1>
        <p className="login-subtitle">
          Redirecionando para a nova tela de recuperação...
        </p>
        <a className="login-link" href="/tela-recuperacao">
          Ir agora
        </a>
      </div>
      <span className="login-footer">Animação Sol e Lua</span>
    </main>
  );
}
