"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../lib/api";
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
      localStorage.setItem("authToken", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      const role = response.data.user.role as Role;
      router.push(getDefaultRoute(role));
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login. Verifique suas credenciais.");
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
          <label className="login-field">
            E-mail
            <input
              type="email"
              name="email"
              required={true}
              placeholder="seu@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>
          <label className="login-field">
            Senha
            <input
              type="password"
              name="password"
              required={true}
              placeholder="********"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </label>
          {error && <p className="error-message">{error}</p>}
          <button className="login-button" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <a className="login-link" href="#">
          Esqueci minha senha
        </a>
      </div>
      <span className="login-footer">Animação Sol e Lua</span>
    </main>
  );
}
