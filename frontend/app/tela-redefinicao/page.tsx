"use client";

import './page.css';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getErrorMessage, resetPassword } from "../../lib/api";
import { useResetPassword } from "../context/ResetPasswordContext";
import logo from "../../assets/logo.png";

interface FormValues {
  novaSenha: string;
  novaSenhaConfirmacao: string;
}

export default function TelaRedefinicaoPage() {
  const router = useRouter();
  const { email, token, clear } = useResetPassword();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      novaSenha: "",
      novaSenhaConfirmacao: "",
    },
  });

  const novaSenha = watch("novaSenha");

  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => {
      router.push("/login");
    }, 1800);
    return () => clearTimeout(timeout);
  }, [router, success]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);

    if (!email || !token) {
      setError("Nao foi possivel continuar. Tente novamente.");
      return;
    }

    try {
      await resetPassword({
        email,
        token,
        novaSenha: values.novaSenha,
        novaSenhaConfirmacao: values.novaSenhaConfirmacao,
      });
      clear();
      setError(null);
      setSuccess("Senha redefinida com sucesso! Indo para o login...");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Nao foi possivel redefinir a senha."));
    }
  };

  return (
    <main className="page login-page">
      <div className="login-card reveal">
        <div className="login-brand">
          <Image src={logo} alt="Sol e Lua Animação" className="login-logo" priority />
        </div>
        <h1 className="login-title">Nova senha</h1>
        <p className="login-subtitle">
          Crie uma nova senha para entrar com segurança.
        </p>

        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          <label className="login-field" htmlFor="nova-senha">
            Nova senha
            <input
              id="nova-senha"
              type="password"
              placeholder="Digite sua nova senha"
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={!!errors.novaSenha}
              aria-describedby={errors.novaSenha ? "nova-senha-error" : undefined}
              {...register("novaSenha", {
                required: "Informe a nova senha.",
                minLength: {
                  value: 6,
                  message: "A senha deve ter pelo menos 6 caracteres.",
                },
              })}
            />
          </label>
          {errors.novaSenha && (
            <p
              id="nova-senha-error"
              className="error-message"
              role="alert"
              aria-live="polite"
            >
              {errors.novaSenha.message}
            </p>
          )}

          <label className="login-field" htmlFor="confirmar-senha">
            Confirmar nova senha
            <input
              id="confirmar-senha"
              type="password"
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={!!errors.novaSenhaConfirmacao}
              aria-describedby={errors.novaSenhaConfirmacao ? "confirmar-senha-error" : undefined}
              {...register("novaSenhaConfirmacao", {
                required: "Confirme a nova senha.",
                validate: (value) =>
                  value === novaSenha || "As senhas nao conferem.",
              })}
            />
          </label>
          {errors.novaSenhaConfirmacao && (
            <p
              id="confirmar-senha-error"
              className="error-message"
              role="alert"
              aria-live="polite"
            >
              {errors.novaSenhaConfirmacao.message}
            </p>
          )}

          {error && (
            <p className="error-message" role="alert" aria-live="polite">
              {error}
            </p>
          )}
          {success && (
            <p className="success-message" role="status" aria-live="polite">
              {success}
            </p>
          )}
          <button className="login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>

        <div className="login-links">
          <a className="login-link" href="/tela-recuperacao">
            Voltar para recuperação
          </a>
        </div>
      </div>
      <span className="login-footer">Animação Sol e Lua</span>
    </main>
  );
}
