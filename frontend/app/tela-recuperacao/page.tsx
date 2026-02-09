"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestPasswordReset, verifyResetToken } from "../../lib/api";
import { useResetPassword } from "../context/ResetPasswordContext";
import logo from "../../assets/logo.png";

export default function TelaRecuperacaoPage() {
  const router = useRouter();
  const { setEmail, setToken, clear } = useResetPassword();
  const [email, setEmailInput] = useState("");
  const [token, setTokenInput] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Informe o e-mail para receber o token.");
      return;
    }

    setSending(true);
    try {
      const response = await requestPasswordReset(email.trim());
      if (response?.data?.debug_token) {
        setMessage(`Token enviado. (Teste: ${response.data.debug_token})`);
      } else {
        setMessage("Token enviado para o seu e-mail.");
      }
    } catch (err: any) {
      setError(err.message || "Nao foi possivel enviar o token.");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim() || !token.trim()) {
      setError("Informe o e-mail e o token recebido.");
      return;
    }

    setVerifying(true);
    try {
      await verifyResetToken({ email: email.trim(), token: token.trim() });
      setEmail(email.trim());
      setToken(token.trim());
      router.push("/tela-redefinicao");
    } catch (err: any) {
      setError(err.message || "Token invalido ou expirado.");
    } finally {
      setVerifying(false);
    }
  };

  const handleBack = () => {
    clear();
    router.push("/login");
  };

  return (
    <main className="page login-page">
      <div className="login-card reveal">
        <div className="login-brand">
          <Image src={logo} alt="Sol e Lua Animação" className="login-logo" priority />
        </div>
        <h1 className="login-title">Recuperar senha</h1>
        <p className="login-subtitle">
          Primeiro informe o email para receber o token, depois cole aqui para continuar.
        </p>

        <form className="login-form" onSubmit={handleSend}>
          <label className="login-field">
            E-mail
            <input
              type="email"
              name="email"
              required={true}
              placeholder="seu@email.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmailInput(event.target.value)}
              disabled={sending || verifying}
            />
          </label>
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}
          <button className="login-button" type="submit" disabled={sending}>
            {sending ? "Enviando..." : "Enviar token"}
          </button>
        </form>

        <form className="login-form" onSubmit={handleVerify}>
          <label className="login-field">
            Token recebido
            <input
              type="text"
              name="token"
              required={true}
              placeholder="Digite o token"
              value={token}
              onChange={(event) => setTokenInput(event.target.value)}
              disabled={sending || verifying}
            />
          </label>
          {error && <p className="error-message">{error}</p>}
          <button className="login-button" type="submit" disabled={verifying}>
            {verifying ? "Verificando..." : "Verificar"}
          </button>
        </form>

        <div className="login-links">
          <button className="login-link button-link" type="button" onClick={handleBack}>
            Voltar para o login
          </button>
        </div>
      </div>
      <span className="login-footer">Animação Sol e Lua</span>
    </main>
  );
}
