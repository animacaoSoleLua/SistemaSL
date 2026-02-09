"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { resetPassword } from "../../lib/api";
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
    } catch (err: any) {
      setError(err.message || "Nao foi possivel redefinir a senha.");
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
          <label className="login-field">
            Nova senha
            <input
              type="password"
              placeholder="Digite sua nova senha"
              autoComplete="new-password"
              disabled={isSubmitting}
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
            <p className="error-message">{errors.novaSenha.message}</p>
          )}

          <label className="login-field">
            Confirmar nova senha
            <input
              type="password"
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              disabled={isSubmitting}
              {...register("novaSenhaConfirmacao", {
                required: "Confirme a nova senha.",
                validate: (value) =>
                  value === novaSenha || "As senhas nao conferem.",
              })}
            />
          </label>
          {errors.novaSenhaConfirmacao && (
            <p className="error-message">{errors.novaSenhaConfirmacao.message}</p>
          )}

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
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
