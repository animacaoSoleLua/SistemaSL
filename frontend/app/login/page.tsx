"use client";

import './page.css';
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage, login } from "../../lib/api";
import { getDefaultRoute, type Role } from "../../lib/auth";
import logo from "../../assets/logo.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await login(email, password);
      // Token em sessionStorage (limpo ao fechar a aba); cookie httpOnly
      // definido pelo backend é o mecanismo principal em produção (HTTPS).
      sessionStorage.setItem("authToken", response.data.access_token);
      sessionStorage.setItem("user", JSON.stringify(response.data.user));
      window.dispatchEvent(new Event("user-updated"));
      const role = response.data.user.role as Role;
      router.push(getDefaultRoute(role));
    } catch (err: unknown) {
      setError("Credenciais invalidas.");
      setEmail("");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page login-page">
      <div className="login-card reveal">
        <div className="login-brand">
          <Image
            src={logo}
            alt="Sol e Lua Animação"
            className="login-logo"
            priority
          />
        </div>
        <h1 className="login-title">Bem-vindo!</h1>
        <p className="login-subtitle">
          Entre com suas credenciais para acessar o sistema
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field" htmlFor="login-email">
            E-mail
            <input
              id="login-email"
              type="email"
              name="email"
              required={true}
              aria-required="true"
              placeholder="seu@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>
          <label className="login-field" htmlFor="login-password">
            Senha
            <input
              id="login-password"
              type="password"
              name="password"
              required={true}
              aria-required="true"
              placeholder="********"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </label>
          {error && (
            <p className="error-message" role="alert" aria-live="polite">
              {error}
            </p>
          )}
          <button className="login-button" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <div className="login-links">
          <a className="login-link login-link--signup" href="/cadastro">
            Não possuo conta
          </a>
          <a className="login-link" href="/tela-recuperacao">
            Esqueci minha senha
          </a>
        </div>
      </div>
      <span className="login-footer">Animação Sol e Lua</span>
    </main>
  );
}
