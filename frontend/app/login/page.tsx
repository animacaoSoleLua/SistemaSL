import Image from "next/image";
import logo from "../../assets/logo.png";

export default function LoginPage() {
  return (
    <main className="page login-page">
      <div className="login-card reveal">
        <div className="login-brand">
          <Image
            src={logo}
            alt="Sol e Lua Animacao"
            className="login-logo"
            priority
          />
        </div>
        <h1 className="login-title">Bem-vindo!</h1>
        <p className="login-subtitle">
          Entre com suas credenciais para acessar o sistema
        </p>
        <form className="login-form">
          <label className="login-field">
            Email
            <input
              type="email"
              name="email"
              required={true}
              placeholder="seu@email.com"
              autoComplete="email"
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
            />
          </label>
          <button className="login-button" type="submit">
            Entrar
          </button>
        </form>
        <a className="login-link" href="#">
          Esqueci minha senha
        </a>
      </div>
      <span className="login-footer">Animacao Sol e Lua</span>
    </main>
  );
}
